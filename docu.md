# usage in html

    <dropdown-box id="selectCountry" imagePath="./components/dropdownBox/assets/countryFlagImages" multiselect maxSelections=7 displayKeys fractions=3 selectedText="countries selected"></dropdown-box>

## multiselect

presence of this attribute makes it multiselect, otherwise it's singleselect

## maxSelections

to limit (or expand) the default (which is a lot as it is)

## selectedText

in multiselect only - when >1 items selected the box displays

    #items + " " + selectedText

## imagePath

- if specified, an image is displayed in front of the item text
- by convention, image filenames in given path must match item KEYS and have ".png" suffix

## displayKeys

- if present, shows keys left aligned in a column on the right side

## fractions

- only relevant when displayKeys is present
- the area in the list is divided vertically in 2 columns: left and right.
    - right column is 1 fraction wide and contains the keys (if displayKeys is specified)
    - left column's number of fractions is specified with this attribute.
    - default is 3, so 1 quarter is for the right column
    - the bigger the number, the smaller the right column.
    - just try empirically until it's nice.

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

