export async function isSaveRequest({ body, headers }) {
  const contentType = headers['content-type'] || '';
  const mediaType = contentType.split(';')[0].trim().toLowerCase();

  if (mediaType === 'application/x-www-form-urlencoded') {
    if (typeof body === 'string') {
      const form = new URLSearchParams(body);
      return form.get('_triggering_element_name') === 'mercury_editor_save' ||
        form.has('mercury_editor_save');
    }
    return body !== null && typeof body === 'object' &&
      (body._triggering_element_name === 'mercury_editor_save' ||
        Object.prototype.hasOwnProperty.call(body, 'mercury_editor_save'));
  }

  if (mediaType === 'multipart/form-data') {
    const form = await new Response(body, {
      headers: { 'Content-Type': contentType },
    }).formData();
    return form.get('_triggering_element_name') === 'mercury_editor_save' ||
      typeof form.get('mercury_editor_save') === 'string';
  }

  return false;
}