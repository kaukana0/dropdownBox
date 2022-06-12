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
* req11 - image in the headerbox
* req12 - layout details (sizes, font, padding etc)
* req13 - accessibility: tab behaviour
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

const template = document.createElement('template');

template.innerHTML = `
<div id='${ms.domElementIds.headBox}'>
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
	padding: 0.3em;
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
	border: 1px solid rgba(0,0,0,.15);
	z-index: 20;
    max-height: 400px;
    top: 1.7em;
    margin-left: 0px;
    margin-right: 0px;
	padding-left: 0.3em;
	left: -1px;
	width: 98%;
    position: absolute;
	text-align: left;
}

li {
	padding-left: 0.3em;
	/* margin: 0.4em; */
	padding-top: 0.3em;
	/* padding-bottom: 0.2em; */
	vertical-align: middle;
}

#${ms.domElementIds.list} li:hover {
    background-color: #CCC;
    color: black;
}

[dropdown-item-checked] {
    background-color: #044aa3;
    color: #BBB;
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
}

</style>`


class Element extends HTMLElement {

	#_imagePath
	#_isMultiselect
	#_selected		// [{key:val}]
	#_callback		// function
	#_currentText

	#$(elementId) {
		return this.shadowRoot.getElementById(elementId)
	}

	constructor() {
		super()

		this.attachShadow({ mode: 'open' })
		this.shadowRoot.appendChild(template.content.cloneNode(true))

		this.#$(ms.domElementIds.headBox).addEventListener('click', () => this.#toggleVisibility())

		document.addEventListener('click', (e) => {		// dismissable
			if(e.target.id != this.id) {
				this.#hide()
			}
		})
	}

	connectedCallback() {
		this.#_imagePath = this.getAttribute('imagePath') || "";
		this.#_isMultiselect = this.hasAttribute('multiselect') ? true : false;
	}

	set data(val) {
		this.#fill(val[0], val[1])
	}

	set callback(val) {
		this.#_callback = val
	}

	get selected() {
		return this.#_selected
	}

	get currentText() {
		return this.#_currentText
	}

	get selectedKeys() {
		return this.#_selected.map((el) => Object.keys(el)[0]);
	}

	static get observedAttributes() {
		return ['data', 'imagePath', 'multiselect'];
	}

	attributeChangedCallback(name, oldVal, newVal) {
		if (name === 'data' || name === 'callback') {
			console.warn("setting "+name+" via html attribute is being ignored. please use js property instead.")
		}
		if (name === 'imagePath') {
			if(this.#_imagePath === undefined) {
				this.#_imagePath = newVal
				// todo: clear and re-fill
			} else {
				console.warn("setting imagePath works only one time. It's ignored now.")
			}
		}
	}

	// note: the purpose of using requestAnimationFrame() here is to make sure 
	// that an element - which we want to access - actually exists.
	// seems that .innerHTML takes a while "asynchroneously"...
	#fill(itemsMap, groupChanges) {
		for (const [key, val] of itemsMap.entries()) {
			this.#addListItem(key, val)
			const elId = ms.domElementIds.listItemPrefix + key
			window.requestAnimationFrame(() => this.#$(elId).onclick = () => {
				this.#onListItemClick(key, val)
			})

			if(this.#_selected === undefined) {	// initially (1st element)
				this.#_selected = [{[key]:val}]
				this.#updateHeadBoxContent()
				if(this.#_isMultiselect) {
					this.#$(elId).setAttribute("dropdown-item-checked","")
				}
				this.#invokeCallback(key, val)
			}

			if(groupChanges && groupChanges.includes(key)) {
				this.#addSeparator()
			}
		}
	}

	#addListItem(key, val) {
		const img = this.#_imagePath === "" ? "" : `<img src='${this.#_imagePath}/${key}.png'></img>`
		this.#$(ms.domElementIds.list).innerHTML += `
          <li id='${ms.domElementIds.listItemPrefix}${key}' key='${key}' val='${val}'>
		  	  <span>${img}
              ${val}</span>
          </li>
    `}

	#addSeparator() {
		this.#$(ms.domElementIds.list).innerHTML += `
          <li>
		  	  <hr>
          </li>
	`}

	#updateHeadBoxContent() {
		const selectedCount = this.#_selected.length
		let html = "&varnothing;"

		if(selectedCount === 1) {	// the case for singleselect OR multiselect w/ 1 element
			const valOf1stElement = Object.values(this.#_selected[0])[0]
			html = valOf1stElement
		} else {
			html = `${selectedCount} selected`	// TODO: translate
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
				this.#_selected.push({[key]:val})
				this.#$(elId).setAttribute("dropdown-item-checked","")
				action()
			}
		} else {	// single select logic
			if(this.#_selected[0] !== {[key]:val}) {	// only if selection changed
				this.#_selected[0] = {[key]:val}
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
			console.warn("dropDownBox: No callback")
		}
	}

	#toggleVisibility() {
		const el = this.#$(ms.domElementIds.list)
		if(this.#_isMultiselect) {
			el.style.display !== "block" ? 	el.style.display = "block" : el.style.display
		} else {
			el.style.display !== "block" ? 	el.style.display = "block" : el.style.display = "none"
		}
	}

	#hide() {
		const el = this.#$(ms.domElementIds.list)
		el.style.display = "none"
	}


}

window.customElements.define('dropdown-box', Element)
