/**
 * Vytvoří element s vlastnostmi
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') element.className = value
    else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value)
    else element.setAttribute(key, value)
  }
  for (const child of children) {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child))
    else if (child) element.appendChild(child)
  }
  return element
}

/**
 * Zkratka pro querySelector
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector)
}

/**
 * Zkratka pro querySelectorAll
 */
export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)]
}
