import 'cypress-iframe';

/**
 * Adds a section.
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
 * Chooses a layout.
 */
Cypress.Commands.add('meChooseLayout', (layoutId) => {
  cy.intercept('POST', '/mercury-editor/**').as('getLayouts');
  cy.get(`input[value="${layoutId}"] + label`).click();
  cy.wait('@getLayouts');
  cy.get('mercury-dialog.lpb-dialog');
});

/**
 * Saves a component.
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
 * Sets the value of a CKEditor Field.
 */
Cypress.Commands.add('meSetCKEditor5Value', (fieldName, value) => {
  const selector = `.field--name-field-${fieldName.replace(/_/g, '-')}`;
  cy.get(`${selector} .ck-content[contenteditable=true]`).then(el => {
    const editor = el[0].ckeditorInstance;
    console.log(el, editor);
    editor.setData(value);
  });
  cy.wait(500);
});

/**
 * Edits the current page.
 */
Cypress.Commands.add('meEditPage', () => {
  cy.get('a.me-edit-screen-toggle').click();
  cy.get('#me-preview').its('0.contentDocument');
});

/**
 * Saves the page.
 */
Cypress.Commands.add('meSavePage', () => {
  cy.intercept('POST', '/mercury-editor/**').as('savePage');
  cy.get('#me-save-btn').click();
  cy.wait('@savePage');
});

Cypress.Commands.add('meDeletePage', () => {
  cy.get('a').contains('Delete').click();
  cy.get('.button--primary:visible').contains('Delete').click();
});

/**
 * Exit the editor.
 */
Cypress.Commands.add('meExitEditor', () => {
  cy.get('#me-done-btn').click();
});

/**
 * Find a component that contains the given text.
 */
Cypress.Commands.add('meFindComponent', (text) => {
  cy.get('#me-preview').its('0.contentDocument').then((document) => {
    const component = Array.from(document.querySelectorAll('[data-uuid]')).filter(el => el.textContent.includes(text)).pop();
    cy.wrap(component);
  });
});

Cypress.Commands.add('meEditComponent', (component) => {
  cy.get(component).find('.lpb-edit').click();
  cy.get('mercury-dialog.lpb-dialog');
});

Cypress.Commands.add('meDeleteComponent', (component) => {
  cy.get(component).find('.lpb-delete').click();
  cy.get('mercury-dialog.lpb-dialog');
  cy.get('.me-dialog__buttonpane .lpb-btn--delete').click();
});
