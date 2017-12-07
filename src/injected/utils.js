export function sendEvent(type, data) {
  const event = new CustomEvent(type, { detail: data == null ? null : data });
  document.dispatchEvent(event);
}

export function getMeta(key) {
  const link = document.querySelector(`link[rel=${key}]`);
  return link && link.getAttribute('href');
}
