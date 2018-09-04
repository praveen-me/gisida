import { parse } from 'papaparse';

function fetchURL(path, mimeType, callback) {
  const xobj = new XMLHttpRequest();
  xobj.overrideMimeType(mimeType);
  xobj.open('GET', path, true);
  xobj.onreadystatechange = () => {
    if (xobj.readyState === 4 && xobj.status === 200) {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

export function loadJSON(path, callback) {
  fetchURL(path, 'application/json', (response) => {
    callback(JSON.parse(response));
  });
}

export async function fetchJSON(path) {
  return fetch(path).then(res => res.json());
}

export async function fetchCSV(path) {
  return fetch(path)
    .then(res => res.text())
    .then(res => parse(res, {
      header: true,
      skipEmptyLines: true,
    }))
    .then(res => res.data);
}

export function loadCSV(path, callback) {
  fetchURL(path, 'text/csv', (response) => {
    callback(parse(response, {
      header: true,
      skipEmptyLines: true,
    }).data);
  });
}

export function isNumber(value) {
  return !Number.isNaN(parseFloat(value));
}
