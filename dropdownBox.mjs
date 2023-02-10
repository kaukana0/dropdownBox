import MarkUpCode from  "./markUpCode.mjs"		// keep this file html/css free

// magic strings
const ms = {
	domElementIds: {
		headBox: 'headBox',     				// the select box (with a little down arrow inside)
		headBoxContent: 'headBoxContent',		// mostly the same as a list entry (text and possibly image), possibly styled differently
		list: 'DropdownList',           		// list below the box; initially invisible
		listItemPrefix: 'ListItem',				// prefix for ids
		spacer: 'spacer'						// pushes the little down arrow in the headbox over to the right
	},
}

class Element extends HTMLElement {

	#_imagePath		// string; from an attribute
	#_isMultiselect	// bool; from an attribute
	#_callback		// function; from an attribute
	#_maxSelections	// from an attribute
	#_displayKeys	// bool; from an attribute; for each entry, show it's on the right side in the area
	#_displayKeyInHeadbox	// bool
	#_fractions		// # of fractions of left side of the listitem list (relevent only for displayKeys. see docu.md)
	#_selected		// [{key:val}] note: in singleselect, list contains 1 element
	#_currentText	// textual representation of what's shown in headBox
	#_isLocked		// if true, user can't influece selection and no callback will be invoked
	#_orderedItems	// for instance ["European Union","Austria",...]
	#_isInitialized

	#$(elementId) {
		return this.shadowRoot.getElementById(elementId)
	}

	constructor() {
		super()

		this.#_isInitialized = false
		this.#_isLocked = false
		this.#_maxSelections = 10
		this.#_orderedItems = []

		this.attachShadow({ mode: 'open' })
		const tmp = MarkUpCode.getHtmlTemplate(MarkUpCode.mainElements(ms) + MarkUpCode.css(ms)).cloneNode(true)
		this.shadowRoot.appendChild(tmp)
	}

	#registerEvents() {
		this.#$(ms.domElementIds.headBox).addEventListener('click', (ev) => this.#toggleVisibility(ev))
		this.#$(ms.domElementIds.headBox).addEventListener('keydown', (e) => {
			if(e.keyCode == 13 || e.keyCode == 32) {
				this.#toggleVisibility(e)
			}
			if(e.keyCode == 27) {
				this.#$(ms.domElementIds.list).style.display = "none"
			}
		})
	}

	connectedCallback() {
		this.#_imagePath = this.getAttribute('imagePath') || ""
		this.#_isMultiselect = this.hasAttribute('multiselect') ? true : false
		this.#_maxSelections = this.hasAttribute('maxSelections') ? this.getAttribute('maxSelections') : 10
		this.#_displayKeys = this.hasAttribute('displayKeys') ? true : false
		this.#_displayKeyInHeadbox = this.hasAttribute('displayKeyInHeadbox') ? true : false
		this.#_fractions = this.hasAttribute('fractions') ? this.getAttribute('fractions') : 3
		if(!this.#_isInitialized) {
			this.#registerEvents()	
			this.#makeDismissable()
			this.#_isInitialized = true
		}
	}

	disconnectedCallback() {
		console.log("dropdownBox: disconnected")
	}

	set data(val) {
		this.#fill(val[0], val[1])
	}

	set callback(val) {
		this.#_callback = val
	}

	set selectedText(val) {
		this.setAttribute('selectedText', val)
	}

	set maxSelections(val) {
		this.setAttribute('maxSelections', val)
	}

	get selectedText() {
		return this.getAttribute('selectedText')
	}

	get selected() {
		return this.#_selected
	}

	get currentText() {
		return this.#_currentText
	}

	get selectedKeys() {
		return this.#_selected.map((el) => Object.keys(el)[0])
	}

	static get observedAttributes() {
		return ['data', 'callback', 'imagePath', 'multiselect', 'maxselections']
	}

	setLocked(isLocked) {
		this.#_isLocked = isLocked
	}

	setSelectedByKey(key) {
		if(typeof key !== "undefined" && key!==null) {
			const val = this.#getValueByKey(key)
			if(val!==null) {
				this.#deselectAll()
				this.#select(key,val)
			} else {
				console.warn(`dropdownBox: setSelectedByKey - key ${key} doesn't exist.`)
			}
		}
	}

	attributeChangedCallback(name, oldVal, newVal) {
		if (name === 'data' || name === 'callback') {
			console.warn("dropdownBox: setting "+name+" via html attribute is being ignored. please use js property instead.")
		}
		if (name === 'imagePath') {
			if(this.#_imagePath === undefined) {
				this.#_imagePath = newVal
				// todo: clear and re-fill
			} else {
				console.warn("dropdownBox: setting imagePath works only one time. It's ignored now.")
			}
		}
		if(name === 'multiselect') {
			// switch multiselect on/off.
			// warning: switch to off while multiple items are selected is untested.
			this.connectedCallback()
		}
		if(name === 'maxselections') {
			if(newVal) {
				this.#_maxSelections = parseInt(newVal)
				this.#resetSelections()	// alternatively, implement removing excessive ones
			}
		}			
	}

	// note: the purpose of using requestAnimationFrame() here is to make sure 
	// that an element - which we want to access - actually exists.
	// seems that .innerHTML takes a while "asynchroneously"...
	#fill(itemsMap, groupChanges) {
		if(itemsMap) {
			for (const [key, val] of itemsMap.entries()) {

				this.#_orderedItems.push(val)
				this.#$(ms.domElementIds.list).innerHTML += MarkUpCode.listItem(ms, key, val, this.#_imagePath, this.#_displayKeys, this.#_fractions)

				const elId = ms.domElementIds.listItemPrefix + key
				window.requestAnimationFrame(() => this.#$(elId).onclick = (ev) => {
					this.#onListItemClick(key, val)
					if(this.#_isMultiselect) {
						ev.stopPropagation()	// don't close dropdown list
					}
				})
				window.requestAnimationFrame(() => this.#$(elId).onkeydown = (e) => {
					if(e.keyCode==13) {
						this.#onListItemClick(key, val)
					}
				})
	
				if(this.#_selected === undefined) {	// initially (1st element)
					this.#select(key, val)
					this.#invokeCallback(key, val)
				}
	
				if(groupChanges && groupChanges.includes(key)) {
					this.#$(ms.domElementIds.list).innerHTML += MarkUpCode.separator()
				}
			}
		} else {
			throw Error("dropdownBox: empty input")
		}
	}

	#getValueByKey(key) {
		var items = this.#$(ms.domElementIds.list).getElementsByTagName("li");
		for (var i = 0; i < items.length; ++i) {
			if(items[i].getAttribute("key") == key) {return items[i].getAttribute("val")}
		}
		return null
	}

	#select(key, val) {
		const elId = ms.domElementIds.listItemPrefix + key
		this.#_selected = [{[key]:val}]
		this.#updateHeadBoxContent()
		this.#$(elId).setAttribute("dropdown-item-checked","")
	}

	#deselectAll() {
		var items = this.#$(ms.domElementIds.list).getElementsByTagName("li");
		for (var i = 0; i < items.length; ++i) {
			items[i].removeAttribute("dropdown-item-checked")
		}
		return null
	}

	#getClearButtonHtml() {
		const uniquePrefix = Math.floor(Math.random() * 10000)
		const id = uniquePrefix+"clearButton"
		// can't use fontawesome or similar because shadow DOM...
		const retVal = MarkUpCode.clearButton(id)
		return [id, retVal]
	}

	#resetSelections(invokeCallback=true) {
		if(this.#_isLocked) return

		if(this.#_isMultiselect) {
			let isFirst = true
			for(const el of this.#$(ms.domElementIds.list).children) {
				if(isFirst) {
					isFirst = false
					const firstBorn = this.#$(ms.domElementIds.list).children[0]
					const key = firstBorn.getAttribute("key")
					const val = firstBorn.getAttribute("val")
					this.#select(key, val)
					if(invokeCallback) { this.#invokeCallback(key, val) }
				} else {
					el.removeAttribute("dropdown-item-checked")
				}
			}
		} else {
			console.error("dropdownBox: Reset despite Single-select mode. How did that happen!?")
		}
	}

	#updateHeadBoxContent() {
		const that = this
		
		const selectedCount = this.#_selected.length
		if(selectedCount === 1) {	// the case for singleselect OR multiselect w/ 1 element
			const key = Object.keys(this.#_selected[0])[0]
			const val = Object.values(this.#_selected[0])[0]
			action(val, MarkUpCode.headBoxContent(this.#_imagePath, key, val, this.#_displayKeyInHeadbox, this.#_fractions))
		} else {
			const text = `${selectedCount} ${this.getAttribute('selectedText') || "selected"}`
			const [elId, clearButtonHtml] = this.#getClearButtonHtml()
			const html = text + "  " + clearButtonHtml
			action(text,html)
			// the innerHTML has to have inserted this element before attaching an evt-handler
			window.requestAnimationFrame(() => {
				if(this.#$(elId)) {
					this.#$(elId).onclick = (ev) => {
						this.#resetSelections()
						ev.stopPropagation()	// don't toggle dropdown
					}
				} else {
					console.debug(`dropdownBox: element w/ id ${elId} doesn't exist`)
				}
			})
		}

		function action(text, html) {
			that.#_currentText = text
			that.#$(ms.domElementIds.headBoxContent).innerHTML = html
		}

	}

	#onListItemClick(key, val, invokeCallback=true) {
		const that = this

		if(this.#_isLocked) return
		
		if(that.#_isMultiselect) {
			handleMultiSelectClick()
		} else {
			handleSingleSelectClick()
		}

		function handleMultiSelectClick() {
			const elId = ms.domElementIds.listItemPrefix + key
			const idx = that.#_selected.findIndex((el)=> Object.keys(el)[0] === key)
			const found = idx > -1
			if(found) {
				if(that.#_selected.length > 1) {
					that.#_selected.splice(idx,1)	// remove
					that.#$(elId).removeAttribute("dropdown-item-checked")
					action()
				} else {
					// nop (at least 1 has to be selected at all times)
				}
			} else {
				if(that.#_selected.length < that.#_maxSelections) {
					that.#_selected.push({[key]:val})	// add
					alignOrderOfSelectedItems()
					that.#$(elId).setAttribute("dropdown-item-checked","")
					action()
				} else {
					// max number of selectable items reached
				}
			}
		}

		function alignOrderOfSelectedItems() {		// ...to the order of dropdownBox items - and do it by value
			that.#_selected.sort((e,f) => {
				const a = that.#_orderedItems.findIndex(_e => _e === Object.entries(f)[0][1])
				const b = that.#_orderedItems.findIndex(_e => _e === Object.entries(e)[0][1])
				return a>b ? -1:1
			})
		}
	
		function handleSingleSelectClick() {
			const elId = ms.domElementIds.listItemPrefix + key
			const selectionChanged = that.#_selected[0] !== {[key]:val}
			if(selectionChanged) {
				// deselect current
				that.#getCurrentlySingleSelectedElement().removeAttribute("dropdown-item-checked")
				// memorize and select new one
				that.#_selected[0] = {[key]:val}
				that.#$(elId).setAttribute("dropdown-item-checked","")
				action()
			} else {
				// nop
			}
		}

		function action() {
			that.#updateHeadBoxContent()
			if(invokeCallback) { that.#invokeCallback(key, val) }
		}

	}
	
	#invokeCallback(key,val) {
		if(this.#_callback !== undefined) {
			this.#_callback(key, val)
		} else {
			console.debug("dropdownBox: No callback")
		}
	}

	#getCurrentlySingleSelectedElement() {
		if(this.#_selected) {
			if(this.#_isMultiselect) {
				console.warn("dropdownBox: not a single-select box")
				return
			} else {
				const selecedElId = ms.domElementIds.listItemPrefix + Object.keys(this.#_selected[0])[0]
				return this.#$(selecedElId)
			}
		} else {
			return
		}
	}

	#toggleVisibility(ev) {
		const list = this.#$(ms.domElementIds.list)
		const isCurrentlyVisible = list.style.display !== "block"

		isCurrentlyVisible ? list.style.display = "block" : list.style.display = "none"

		if(!this.#_isMultiselect && isCurrentlyVisible) {
			const selEl = this.#getCurrentlySingleSelectedElement()
			if(selEl) { selEl.scrollIntoView() }
			// note: the list stores where it was last scrolled to.
			// so, if for instance, you select the first item and scroll all the way down,
			// without this, it would stay down, with this, it's scrolled topmost
		}

		//ev.stopPropagation()
	
		// note: clicks anywhere else other than this component are handled under dismissability
	}

	#makeDismissable() {
		// note: use element in light DOM, not any element from inside this component
		document.addEventListener('click', (e) => {
			if(e.target.id != this.id) {
				const el = this.#$(ms.domElementIds.list)
				el.style.display = "none"
			}
		})
	}


}

window.customElements.define('dropdown-box', Element)
