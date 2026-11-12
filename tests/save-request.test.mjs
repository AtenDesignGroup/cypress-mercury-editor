import assert from 'node:assert/strict';
import test from 'node:test';
import { isSaveRequest } from '../src/save-request.mjs';

test('matches URL-encoded Save submissions, including parsed objects', async () => {
  const headers = { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' };
  assert.equal(await isSaveRequest({ headers, body: 'mercury_editor_save=Save+changes' }), true);
  assert.equal(await isSaveRequest({ headers, body: { mercury_editor_save: 'Save changes' } }), true);
  assert.equal(await isSaveRequest({ headers, body: 'title=mercury_editor_save' }), false);
  assert.equal(await isSaveRequest({ headers, body: { op: 'Save progress' } }), false);
  assert.equal(await isSaveRequest({ headers, body: '_triggering_element_name=mercury_editor_save' }), true);
  assert.equal(await isSaveRequest({ headers, body: { _triggering_element_name: 'mercury_editor_save' } }), true);
  assert.equal(await isSaveRequest({ headers, body: '_triggering_element_name=autosave' }), false);
});

test('matches multipart Save submissions with file uploads', async () => {
  const form = new FormData();
  form.set('mercury_editor_save', 'Save changes');
  form.set('upload', new Blob(['image contents']), 'image.txt');
  const encoded = new Response(form);
  const headers = { 'content-type': encoded.headers.get('content-type') };
  const body = await encoded.arrayBuffer();
  assert.equal(await isSaveRequest({ headers, body }), true);
  assert.equal(await isSaveRequest({ headers, body: Buffer.from(body) }), true);
});

test('does not mistake multipart values or file contents for Save fields', async () => {
  const form = new FormData();
  form.set('title', 'mercury_editor_save');
  form.set('upload', new Blob(['mercury_editor_save=Save changes']), 'save.txt');
  const encoded = new Response(form);
  assert.equal(await isSaveRequest({
    headers: { 'content-type': encoded.headers.get('content-type') },
    body: await encoded.arrayBuffer(),
  }), false);
});

test('matches multipart AJAX trigger names without a native button field', async () => {
  const form = new FormData();
  form.set('_triggering_element_name', 'mercury_editor_save');
  const encoded = new Response(form);
  assert.equal(await isSaveRequest({
    headers: { 'content-type': encoded.headers.get('content-type') },
    body: await encoded.arrayBuffer(),
  }), true);
});

test('ignores unsupported payloads', async () => {
  assert.equal(await isSaveRequest({ headers: {}, body: '' }), false);
  assert.equal(await isSaveRequest({
    headers: { 'content-type': 'application/json' },
    body: { mercury_editor_save: 'Save changes' },
  }), false);
});