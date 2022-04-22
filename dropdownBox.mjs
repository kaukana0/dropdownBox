/*
* req1 (done) - have a dropdownbox w/ arrow in it opening/closing a list of options
* req2 (done) - multiselect or single select ability
* req3 (done) - selectbox data format: {OPT1:'Option 1'}
* req4 (done) - show images in front of text (image names like OPT1.png)
* req5 - show a checkmark rightmost in option if it's selected
* req6 (done) - scrollable w/ adjustable max size
* req7 (done) - get selected element(s) (their key)
* req8 (done) - make dropdown list topmost and not pushing down contents
* req9 (done) - when multiselect say "N selected" or display the 1 that's selected (also w/ image same as in list)
* req10 - dismissive dropdown
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
	border: 1px solid rgba(0,0,0,.15);
    cursor: pointer;
}


#${ms.domElementIds.headBoxContent} {
	height: 2em;
	overflow: clip;
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
    margin-top: 0.75em;
}

#${ms.domElementIds.list} {
	display: none;

	list-style: none;
	background-color: #fff;
	overflow: auto;
	border: 1px solid rgba(0,0,0,.15);
	z-index: 20;

	//height: 300px;
    max-height: 400px;
    top: 0.55em;
    margin-left: 0px;
    margin-right: 0px;
	padding-left: 0px;
    position: absolute;
	text-align: left;
}

#${ms.domElementIds.list} li:hover {
    background-color: #009;
    color: white;
}

</style>`


class MyElement extends HTMLElement {

	#_imagePath
	#_isMultiselect
	#_selected		// [{key:val}]
	#_callback		// function

	#$(elementId) {
		return this.shadowRoot.getElementById(elementId)
	}

	constructor() {
		super()

		this.attachShadow({ mode: 'open' })
		this.shadowRoot.appendChild(template.content.cloneNode(true))

		this.#$(ms.domElementIds.headBox).addEventListener('click', () => this.#toggleVisibility())
	}

	connectedCallback() {
		this.#_imagePath = this.getAttribute('imagePath') || "";
		this.#_isMultiselect = this.hasAttribute('multiselect') ? true : false;
	}

	set data(val) {		
		this.#fill(val)
	}

	set callback(val) {
		this.#_callback = val
	}

	get selected() {
		return this.#_selected
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
	// that an element - to which we want to attach an event - actually exists.
	// seems that .innerHTML takes a while "asynchroneously"...
	#fill(entries) {
		Object.entries(entries).forEach(([key, val]) => {
			this.#addListItem(key, val)
			const elId = ms.domElementIds.listItemPrefix + key
			window.requestAnimationFrame(() => this.#$(elId).onclick = () => this.#onListItemClick(key, val))

			if(this.#_selected === undefined) {	// initially
				this.#_selected = [{[key]:val}]
				//this.#$(ms.domElementIds.headBoxContent).innerHTML = `<p style="display:inline-block; width=80px; font-stretch:100%; text-size-adjust:100%">${val}</p>`
				this.#$(ms.domElementIds.headBoxContent).innerHTML = val
				this.#invokeCallback(key, val)
			}
		})
	}

	#addListItem(key, val) {
		const img = this.#_imagePath === "" ? "" : `<img src='${this.#_imagePath}/${key}.png'></img>`
		this.#$(ms.domElementIds.list).innerHTML += `
          <li id='${ms.domElementIds.listItemPrefix}${key}' key='${key}' val='${val}'>
		  	  <span>${img}
              ${val}</span>
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
		this.#$(ms.domElementIds.headBoxContent).innerHTML = html
	}

	#onListItemClick(key, val) {
		const that = this

		function action() {
			that.#updateHeadBoxContent()
			that.#invokeCallback(key, val)
		}

		if(this.#_isMultiselect) {
			const idx = this.#_selected.findIndex((el)=> Object.keys(el)[0] === key)
			const found = idx > -1
			if(found) {
				if(this.#_selected.length > 1) {
					this.#_selected.splice(idx,1)	// remove
					action()
				} else {
					// nop (at least 1 has to be selected at all times)
				}
			} else {
				this.#_selected.push({[key]:val})
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
		}
	}

	#toggleVisibility(e) {
		const el = this.#$(ms.domElementIds.list)
		el.style.display !== "block" ? 	el.style.display = "block" : el.style.display = "none"
	}


}

window.customElements.define('dropdown-box', MyElement)
