import 'cypress-iframe';

/**
 * Opens the "Add component" dialog for a layout enabled paragraph component.
 *
 * @param {string} type
 *  The machine name of layout enabled paragraph type. Example: `section`.
 * @param {object} options
 *  Options for the component. If ommitted, the component will be added in the first available location.
 * @param {string} options.section
 *  The CSS selector for an existing section to add the component to. Used in conjunction with `options.region`.
 * @param {string} options.region
 *  The machine name of the region to add the component to. Used in conjunction with `options.section`.
 * @param {string} options.before
 *  The CSS selector for an existing component to add the new component before.
 * @param {string} options.after
 *  The CSS selector for an existing component to add the new component after.
 */
Cypress.Commands.add('meAddComponent', (type, options = {}) => {
  cy.get('#me-preview').its('0.contentDocument').then((document) => {
    if (options.section && options.region) {
      cy.get(options.section).find(`[data-region="${options.region}"]`).find('.lpb-btn--add').click();
    } else if (options.before) {
      cy.get(options.before).find('> .lpb-btn--add.before').click();
    } else if (options.after) {
      cy.get(options.after).find('> .lpb-btn--add.after').click();
    } else {
      cy.wrap(document).find('.lpb-btn--add').first().click();
    }
    cy.get('.lpb-component-list');
    cy.get(`.type-${type} a`).click();
    cy.get('mercury-dialog.lpb-dialog');
  });
});

/**
 * Chooses a layout from a list of options when a layout edit form is open.
 *
 * @param {string} layoutId
 *   The machine name of the layout to choose.
 */
Cypress.Commands.add('meChooseLayout', (layoutId) => {
  cy.intercept('POST', '/mercury-editor/**').as('getLayouts');
  cy.get(`input[value="${layoutId}"] + label`).click();
  cy.wait('@getLayouts');
  cy.get('mercury-dialog.lpb-dialog');
});

/**
 * Clicks the save button on an open add or edit component dialog.
 */
Cypress.Commands.add('meSaveComponent', () => {
  cy.get('#me-preview').its('0.contentDocument').then((document) => {
    const uuids = Array.from(document.querySelectorAll('[data-uuid]')).map(el => el.getAttribute('data-uuid'));
    cy.intercept({
      method: 'POST',
      pathname: '/mercury-editor/**',
      times: 1
    }).as('saveComponent');
    cy.get('mercury-dialog.lpb-dialog form').then((form) => {
      const parts = form.attr('action').split('/');
      const action = parts[parts.length - 2];
      const uuid = action == 'edit' ? parts.pop() : null;
      cy.get('.me-dialog__buttonpane .lpb-btn--save').click();
      cy.wait('@saveComponent').then(() => {
        cy.wait(500).then(() => {
          const uuids2 = Array.from(document.querySelectorAll('[data-uuid]')).map(el => el.getAttribute('data-uuid'));
          const newUuid = uuids2.filter(uuid => !uuids.includes(uuid)).pop();
          cy.get(document).find(`[data-uuid="${uuid || newUuid}"]`);
        });
      });
    });
  });
});

/**
 * Sets the value of a CKEditor5 Field.
 *
 * @param {string} fieldName
 *   The machine name of the field containing a CKEditor5 widget.
 * @param {string} value
 *   The text or html value to set within the CKEditor5 field widget.
 */
Cypress.Commands.add('meSetCKEditor5Value', (fieldName, value) => {
  const selector = `.field--name-${fieldName.replace(/_/g, '-')}`;
  cy.get(`${selector} .ck-content[contenteditable=true]`).then(el => {
    const editor = el[0].ckeditorInstance;
    console.log(el, editor);
    editor.setData(value);
  });
  cy.wait(500);
});

/**
 * Visit the Mercury Editor interface by clicking the "Edit" link on a entity view page.
 */
Cypress.Commands.add('meEditPage', () => {
  cy.get('a.me-edit-screen-toggle').click();
  cy.get('#me-preview').its('0.contentDocument');
});

/**
 * Saves the entity by clicking the `Save` button in the Mercury Editor interface.
 */
Cypress.Commands.add('meSavePage', () => {
  cy.intercept('POST', '/mercury-editor/**').as('savePage');
  cy.intercept({
    method: 'POST',
    pathname: '/mercury-editor/**',
    times: 1
  }).as('savePage');
  cy.get('#me-save-btn').click();
  cy.wait('@savePage');
});

/**
 * Deletes the entity by clicking the `Delete` button in the Mercury Editor interface.
 * This will open a confirmation dialog, and then delete the entity.
 */
Cypress.Commands.add('meDeletePage', () => {
  cy.get('a').contains('Delete').click();
  cy.get('.button--primary:visible').contains('Delete').click();
});

/**
 * Exit the editor by clicking the done button.
 */
Cypress.Commands.add('meExitEditor', () => {
  cy.get('#me-done-btn').click();
  cy.url();
});

/**
 * Find a component that contains the given text.
 *
 * @param {string} text
 *   The text to search for within the component.
 */
Cypress.Commands.add('meFindComponent', (text) => {
  cy.get('#me-preview').its('0.contentDocument').then((document) => {
    const component = Array.from(document.querySelectorAll('[data-uuid]')).filter(el => el.textContent.includes(text)).pop();
    cy.wrap(component);
  });
});

/**
 * Open the edit component dialog by clicking the edit button on an existing paragraph.
 *
 * @param {string|alias} component
 *  The CSS selector or cypress alias for the component to edit.
 *
 */
Cypress.Commands.add('meEditComponent', (component) => {
  cy.get(component).find('.lpb-edit').click();
  cy.get('mercury-dialog.lpb-dialog');
});

/**
 * Delete a component by clicking the delete button on an existing paragraph.
 *
 * @param {string|alias} component
 *  The CSS selector or cypress alias for the component to edit.
 */
Cypress.Commands.add('meDeleteComponent', (component) => {
  cy.get(component).find('.lpb-delete').click();
  cy.get('mercury-dialog.lpb-dialog');
  cy.get('.me-dialog__buttonpane .lpb-btn--delete').click();
});
