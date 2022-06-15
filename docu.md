# usage in html

    <dropdown-box id="selectCountry" imagePath="./components/dropdownBox/assets/countryFlagImages" multiselect maxSelections=7 selectedText="countries selected"></dropdown-box>

## multiselect

presence of this attribute makes it multiselect, otherwise it's singleselect

## maxSelections

to limit the default (which is like 50 or something)

## selectedText

in multiselect only - when >1 items selected the box displays

    #items + " " + selectedText

## imagePath

- if specified, an image is displayed in front of the item text
- by convention, image filenames in given path must match item KEYS and have ".png" suffix

# usage in JS

## setting it up

### setting data

    document.getElementById("selectCountry").data = {EU27_2020: 'European Union', EA19: 'Euro area', BE: 'Belgium', BG: 'Bulgaria', CZ: 'Czechia'}

### setting callback

    document.getElementById("selectCountry").callback = (key,value) => doSomething(key,value)

- invoked on user interaction
- key/val is from clicked item (the same in both, single- and multiselect mode)

## getting selections

### the keys

    const theKeys = document.getElementById("selectCountry").selectedKeys
    // type: [strings]  (same in both, single and multiselect mode)

### the whole thing 

    const selections = document.getElementById("selectCountry").selected
    // type: [{key:val}]  (same in both, single and multiselect mode)

