/*
* req1 - have a dropdownbox w/ arrow in it opening/closing a list of options
* req2 - multiselect or single select ability
* req3 - data format: {OPT1:'Option 1'}
* req4 - show images in front of text (image names like OPT1.png)
* req5 - show a checkmark rightmost in option if it's selected
* req6 - scrollable w/ adjustable max size
* req7 - get selected element(s) (their key)
* req8 - make dropdown list topmost and not pushing down contents
* req9 - when multiselect say "N selected" or display the 1 that's selected (also w/ image same as in list)
*/

// magic strings
const ms = {
	id: {
		HeadBox: 'HeadBox',     // the select box (with a little down arrow inside)
		List: 'DropdownList',           // list below the box; initially invisible
		ListItemPrefix: 'ListItem',
		CurrentSelectDisplay: 'currentSelectDisplay'
	},
}

const template = document.createElement('template');

template.innerHTML = `
  <div id='${ms.id.HeadBox}' style="position:relative;">
    <div id='${ms.id.CurrentSelectDisplay}'>&varnothing;</div>
	<ul id='${ms.id.List}' style="display: none;"></ul>
  </div>
`


template.innerHTML += `<style>

#${ms.id.HeadBox} {
	width: 196px;
	border: 1px solid rgba(0,0,0,.15);
	text-align: left;
}

#${ms.id.CurrentSelectDisplay} {
	display: inline-block;
	margin: 0.1em;
	padding: 0.1em;
}

/* this is bootstrap's CSS triangle */
#${ms.id.CurrentSelectDisplay}::after {
    display: inline-block;
    margin-left: 0.255em;
    vertical-align: 0.255em;
    content: "";
    border-top: 0.3em solid;
    border-right: 0.3em solid transparent;
    border-bottom: 0;
    border-left: 0.3em solid transparent;
}

#${ms.id.List} {
	list-style: none;
	background-color: #fff;
	overflow: auto;
	border: 1px solid rgba(0,0,0,.15);
	z-index: 20;

	width: 196px;
    max-height: 400px;
    top: 0.5em;
    cursor: pointer;
    margin-left: 0px;
    margin-right: 0px;
	padding-left: 0px;
    position: absolute;
	text-align: left;
}

#${ms.id.List} li:hover {
    background-color: #000;
    color: white;
}

</style>`


class MyElement extends HTMLElement {

	$(elementId) {
		return this._shadow.getElementById(elementId)
	}

	constructor() {
		super()

		this._shadow = this.attachShadow({ mode: 'open' })
		this._shadow.appendChild(template.content.cloneNode(true))

		this.headBox = this.$(ms.id.HeadBox)
		this.headBox.addEventListener('click', () => this.toggleVisibility())
	}

	connectedCallback() {
		this._imagePath = this.getAttribute('imagePath') || "";
	}

	set data(val) {		
		this.fill(val)
	}

	set callback(val) {
		this._callback = val
	}

	static get observedAttributes() {
		return ['data', 'imagePath'];
	}

	attributeChangedCallback(name, oldVal, newVal) {
		if (name === 'data' || name === 'callback') {
			console.warn("setting "+name+" via html attribute is being ignored. please use js property instead.")
		}
		if (name === 'imagePath') {
			if(this._imagePath === undefined) {
				this._imagePath = newVal
				// todo: clear and re-fill
			} else {
				console.warn("setting imagePath works only one time. It's ignored now.")
			}
		}
	}

	// note: the purpose of using requestAnimationFrame() here is to make sure 
	// that an element - to which we want to attach an event - actually exists.
	// seems that .innerHTML takes a while "asynchroneously"...
	fill(entries) {
		Object.entries(entries).forEach(([key, val]) => {
			this.addListItem(key, val)
			window.requestAnimationFrame(() => this.$(ms.id.ListItemPrefix + key).onclick = (e) => this.onListItemClick(e))

			if(this._selected === undefined) {	// initially
				this._selected = key
				this.$(ms.id.CurrentSelectDisplay).innerHTML = val
				this.triggerCallback(key, val)
			}
		})
	}

	addListItem(key, val) {
		const img = this._imagePath === "" ? "" : `<img src='${this._imagePath}/${key}.png'></img>`
		this.$(ms.id.List).innerHTML += `
          <li id='${ms.id.ListItemPrefix}${key}' key='${key}' val='${val}'>
		  	  <span>${img}
              ${val}</span>
          </li>
    `}

	onListItemClick(e) {
		const key = e.target.parentNode.getAttribute("key")
		if(this._selected !== key) {	// only if selection changed
			this._selected = key
			const val = e.target.parentNode.getAttribute("val")
			this.$(ms.id.CurrentSelectDisplay).innerHTML = val
			this.triggerCallback(key, val)
		}
	}
	
	triggerCallback(key,val) {
		if(this._callback !== undefined) {
			this._callback(key, val)
		}
	}

	toggleVisibility(e) {
		const el = this.$(ms.id.List)
		el.style.display !== "block" ? 	el.style.display = "block" : el.style.display = "none"
	}


}

window.customElements.define('dropdown-box', MyElement)
