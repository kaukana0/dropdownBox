/*
all HTML and CSS as JS string
*/

export default class MarkUpCode {


	static mainElements(ms) {
		return `
		<div id='${ms.domElementIds.headBox}' tabindex="0">
		  <div id='${ms.domElementIds.headBoxContent}'>&varnothing;</div>
		  <ul id='${ms.domElementIds.list}'></ul>
		</div>
		`
	}

	static css(ms, zIndex) {
		return `<style>
		#${ms.domElementIds.headBox} {
			position:relative;
			display: flex;
			border: 1px solid rgba(0,0,0,1);
			cursor: pointer;
			height: 2em;
			align-items: center;
			padding: 0.2em;
			/*font-weight: bold;*/
			font-size: 1.1rem;
		}
		
		
		#${ms.domElementIds.headBoxContent} {
			height: 1.8em;
			width: 100%;
			overflow: hidden;
			margin-top: 0.4em;
			margin-left: 0.3em;
			text-align: left;
		}
		
		#${ms.domElementIds.headBoxContent} button {
			color:black; 
			vertical-align: text-bottom;
			/*background-color: #FFFFED;*/
			border: 1px solid black;
			border-radius:2px;
			/*border-radius:14px;*/
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
			z-index: ${zIndex};
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

		/* after the first child, which is a div with a grid */
		[dropdown-item-checked] ::after {
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
	}

	// just for 1 row. a means to have a right column which is left aligned.
	static grid(fractions, content) {
		return `
			<div style="display: grid; grid-template-columns: ${fractions}fr 1fr;">
				${content}
			</div>
		`
	}

    static listItem(ms, key, val, path, displayKeys, fractions) {
		const imgHtml =  MarkUpCode.image(path, key)
		const keyHtml =  displayKeys ? `<div>${key}</div>` : ""
		return `
			<li id='${ms.domElementIds.listItemPrefix}${key}' key='${key}' val='${val}' tabindex="0">
				${MarkUpCode.grid(fractions, `<div>${imgHtml} ${val}</div>${keyHtml}`)}
			</li>
		`
	}

	static headBoxContent(path, key, val, displayKey, fractions) {
		if(path) {		
			// image left, then text
			return `${MarkUpCode.image(path,key)} ${val}`
		} else {		
			// no image, text, possibly key in right column
			return MarkUpCode.grid(fractions, "<div>"+val+"</div>" + (displayKey?key:""))
		}
	}

	static image(path, key) {
		return path ? `<img src='${path}/${key}.png' style="height:1.4rem; vertical-align: text-bottom;"></img>` : ""	
	}

    static clearButton(id) {
        return `<button id="${id}" type='button'>Reset</button>`
    }

	static separator() { return "<hr>" }

	// helper
	static getHtmlTemplate(source) {
		const t = document.createElement('template')
		t.innerHTML = source
		return t.content
	}
}