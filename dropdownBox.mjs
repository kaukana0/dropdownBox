/*
* req1 (done) - have a dropdownbox w/ arrow in it opening/closing a list of options
* req2 (done) - multiselect or single select ability
* req3 (done) - selectbox data format: {OPT1:'Option 1'}
* req4 (done) - show images in front of text (convention: image names like OPT1.png)
* req5 (done) - show a checkmark rightmost in option if it's selected
* req6 (done) - scrollable w/ adjustable max size
* req7 (done) - get selected element(s) (their key)
* req8 (done) - make dropdown list topmost and not pushing down page contents
* req9 (done) - when multiselect say "N selected" or display the 1 that's selected
* req10 (done) - dismissible dropdown
* req11 (done) - image in the headerbox
* req12  (done) - layout details (sizes, font, padding etc)
* req13 (done) - accessibility: tab behaviour
*/

// magic strings
const ms = {
	domElementIds: {
		headBox: 'headBox',     				// the select box (with a little down arrow inside)
		headBoxContent: 'headBoxContent',		// mostly the same as a list entry (text and possibly image)
		list: 'DropdownList',           		// list below the box; initially invisible
		listItemPrefix: 'ListItem',
		spacer: 'spacer'
	},
}

const template = document.createElement('template')

template.innerHTML = `
<div id='${ms.domElementIds.headBox}' tabindex="0">
  <div id='${ms.domElementIds.headBoxContent}'>&varnothing;</div>
  <div id='${ms.domElementIds.spacer}'></div>
  <ul id='${ms.domElementIds.list}'></ul>
</div>
`


template.innerHTML += `<style>

#${ms.domElementIds.headBox} {
	position:relative;
	display: flex;
	border: 1px solid rgba(0,0,0,1);
    cursor: pointer;
	height: 2em;
	align-items: center;
	padding: 0.2em;
	font-weight: bold;
	font-size: 1.2rem;
}


#${ms.domElementIds.headBoxContent} {
	height: 1.8em;
	overflow: hidden;
	margin-top: 0.4em;
	margin-left: 0.3em;
	text-align: left;
}

#${ms.domElementIds.spacer} {
	flex-grow: 1;
}

/* this is bootstrap's CSS triangle; only positionable here via margin */
#${ms.domElementIds.headBox}:after {
	content: "";
    border-top: 0.3em solid;
    border-right: 0.3em solid transparent;
    border-bottom: 0;
    border-left: 0.3em solid transparent;
	margin-right: 0.255em;
}

#${ms.domElementIds.list} {
	display: none;
	list-style: none;
	background-color: #fff;
	overflow: auto;
	border: 1px solid rgba(0,0,0,1);
	z-index: 20;
    max-height: 400px;
    top: 1.8em;
    margin-left: 0px;
    margin-right: 0px;
	padding-left: 0.3em;
	left: -1px;
	width: 98.5%;
    position: absolute;
	text-align: left;
	font-weight: normal;
	font-size: 1rem;
}

#${ms.domElementIds.list} li {
	padding-top: 0.3em;
	padding-left: 0.3em;
	padding-right: 0.3em;
	line-height: 1.8rem;
}

#${ms.domElementIds.list} li:hover {
    background-color: #CCC;
    color: black;
}

[dropdown-item-checked] {
    background-color: #044aa308;
}

[dropdown-item-checked]:after {
	position: absolute;
	right: 0.8rem;
	margin-top: 1px;
	content: '';
	width: 6px;
	height: 12px;
	border-bottom: 3px solid #666;
	border-right: 3px solid #666;
	transform: rotate(45deg);
	-o-transform: rotate(45deg);
	-ms-transform: rotate(45deg);
	-webkit-transform: rotate(45deg);
	border-color: black;
}

</style>`


class Element extends HTMLElement {

	#_imagePath
	#_isMultiselect
	#_selected		// [{key:val}]
	#_callback		// function
	#_currentText
	#_maxSelections

	#$(elementId) {
		return this.shadowRoot.getElementById(elementId)
	}

	constructor() {
		super()

		this.#_maxSelections = 10

		this.attachShadow({ mode: 'open' })
		const tmp = template.content.cloneNode(true)
		this.shadowRoot.appendChild(tmp)

		this.#$(ms.domElementIds.headBox).addEventListener('click', (el) => this.#toggleVisibility(el))
		this.#$(ms.domElementIds.headBox).addEventListener('keydown', (e) => {
			if(e.keyCode == 13 || e.keyCode == 32) {
				this.#toggleVisibility(e)
			}
			if(e.keyCode == 27) {
				this.#$(ms.domElementIds.list).style.display = "none"
			}
		})
		//this.#$(ms.domElementIds.headBox).addEventListener('focusout', (e) => {
		//})

		this.#makeDismissable()
	}

	connectedCallback() {
		this.#_imagePath = this.getAttribute('imagePath') || ""
		this.#_isMultiselect = this.hasAttribute('multiselect') ? true : false
		this.#_maxSelections = this.hasAttribute('maxSelections') ? this.getAttribute('maxSelections') : 100
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
		return ['data', 'callback', 'imagePath']
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
	}

	// note: the purpose of using requestAnimationFrame() here is to make sure 
	// that an element - which we want to access - actually exists.
	// seems that .innerHTML takes a while "asynchroneously"...
	#fill(itemsMap, groupChanges) {
		if(itemsMap) {
			for (const [key, val] of itemsMap.entries()) {
				this.#addListItem(key, val)
				const elId = ms.domElementIds.listItemPrefix + key
				window.requestAnimationFrame(() => this.#$(elId).onclick = () => {
					this.#onListItemClick(key, val)
				})
				window.requestAnimationFrame(() => this.#$(elId).onkeydown = (e) => {
					if(e.keyCode==13) {
						this.#onListItemClick(key, val)
					}
				})
	
				if(this.#_selected === undefined) {	// initially (1st element)
					this.#_selected = [{[key]:val}]
					this.#updateHeadBoxContent()
					this.#$(elId).setAttribute("dropdown-item-checked","")
					this.#invokeCallback(key, val)
				}
	
				if(groupChanges && groupChanges.includes(key)) {
					this.#addSeparator()
				}
			}
		} else {
			throw Error("dropdownBox: empty input")
		}
	}

	#addListItem(key, val) {
		const img = this.#_imagePath === "" ? "" : this.#getImageHtml(key)
		this.#$(ms.domElementIds.list).innerHTML += `
          <li id='${ms.domElementIds.listItemPrefix}${key}' key='${key}' val='${val}' tabindex="0">
		  	  ${img} ${val}
          </li>
    `}

	#addSeparator() {
		this.#$(ms.domElementIds.list).innerHTML += `<hr>`
	}

	#getImageHtml(key) {
		return this.#_imagePath === "" ? "" : `<img src='${this.#_imagePath}/${key}.png' style="height:1.4rem; vertical-align: text-bottom;"></img>`
	}

	#updateHeadBoxContent() {
		const selectedCount = this.#_selected.length
		let html = "&varnothing;"

		if(selectedCount === 1) {	// the case for singleselect OR multiselect w/ 1 element
			const val = Object.values(this.#_selected[0])[0]
			const key = Object.keys(this.#_selected[0])[0]
			html = this.#getImageHtml(key) + " " + val
		} else {
			html = `${selectedCount} ${this.getAttribute('selectedText') || "selected"}`
		}
		this.#_currentText = html
		this.#$(ms.domElementIds.headBoxContent).innerHTML = html
	}

	#onListItemClick(key, val) {
		const that = this

		function action() {
			that.#updateHeadBoxContent()
			that.#invokeCallback(key, val)
		}

		const elId = ms.domElementIds.listItemPrefix + key

		if(this.#_isMultiselect) {
			const idx = this.#_selected.findIndex((el)=> Object.keys(el)[0] === key)
			const found = idx > -1
			if(found) {
				if(this.#_selected.length > 1) {
					this.#_selected.splice(idx,1)	// remove
					this.#$(elId).removeAttribute("dropdown-item-checked")
					action()
				} else {
					// nop (at least 1 has to be selected at all times)
				}
			} else {
				if(this.#_selected.length < this.#_maxSelections) {
					this.#_selected.push({[key]:val})	// add
					this.#$(elId).setAttribute("dropdown-item-checked","")
					action()
				} else {
					// max number of selectable items reached
				}
			}
		} else {	// single select logic
			const selectionChanged = this.#_selected[0] !== {[key]:val}
			if(selectionChanged) {
				// deselect current
				this.#getCurrentlySingleSelectedElement().removeAttribute("dropdown-item-checked")
				// memorize and select new one
				this.#_selected[0] = {[key]:val}
				this.#$(elId).setAttribute("dropdown-item-checked","")

				action()
			} else {
				// nop
			}
		}
	}
	
	#invokeCallback(key,val) {
		if(this.#_callback !== undefined) {
			this.#_callback(key, val)
		} else {
			console.warn("dropdownBox: No callback")
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

	#toggleVisibility(el) {
		let toggle
		if(this.#_isMultiselect) {
			if( [ms.domElementIds.headBox, ms.domElementIds.headBoxContent].includes(el.target.id) ) {
				toggle = true
			} else {
				// stay open when selected sth from list
				toggle = false
			}
		} else {
			// close when clicked on head or selected sth from list
			toggle = true
		}
		if(toggle) {
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
		}

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
