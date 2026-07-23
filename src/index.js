import 'cypress-iframe';

const meGetEntityBasePath = () => {
  return cy.location('pathname').then((pathname) => {
    const normalizedPath = pathname.replace(/\/+$/, '');

    return normalizedPath.replace(
      /\/(edit|delete|revisions)(?:\/.*)?$/,
      '',
    );
  });
};

/**
 * Checks if the given form has auto-save enabled.
 * Returns a promise that resolves with an object containing:
 * - `autoSave`: boolean indicating if auto-save is enabled.
 * - `data`: the serialized data if auto-save is enabled, otherwise null.
 * - `$form`: the jQuery object of the form.
 */
Cypress.Commands.add('meCheckForAutoSave', (form) => {
  return cy.get(form, { log: false }).then(($form) => {
    const formEl = $form[0];
    return new Cypress.Promise((resolve, reject) => {
      const start = Date.now();
      const interval = 50;

      const check = () => {
        if (!formEl.querySelector('.me-autosave-btn')) {
          resolve({autoSave: false, data: null, $form});
        } else if (formEl.serializedData) {
          resolve({autoSave: true, data: formEl.serializedData, $form});
        } else if (Date.now() - start >= 500) {
          resolve({autoSave: false, data: null, $form});
        } else {
          setTimeout(check, interval);
        }
      };

      check();
    });
  });
});

/**
 * Opens the "Add component" sidebar for a layout enabled paragraph component.
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

  if (options.section && options.section.attr('data-active') !== 'true') {
    throw new Error('The section option must be current the active component.');
  }

  cy.get('#me-preview').its('0.contentDocument').then((document) => {
    let subject;
    let selector;
    if (options.section && options.region) {
      subject = options.section;
      selector = `[data-region="${options.region}"] .lpb-btn--add`;
    } else if (options.before) {
      subject = options.before;
      selector = '> .lpb-btn--add.before';
    } else if (options.after) {
      subject = options.after;
      selector = '> .lpb-btn--add.after';
    } else {
      subject = document;
      selector = '.lpb-btn--add';
    }

    cy.intercept({
      method: 'POST',
      url: /\/mercury-editor\/[a-f0-9]{32}\/choose-component|\/mercury-editor\/[a-f0-9-]+\/[a-f0-9-]+\/action\/insert/,
      times: 1,
    }).as('componentMenu');
    cy.get(subject).find(selector).first().click({ force: true });
    cy.wait('@componentMenu', { timeout: 10000 });
    cy.get('.lpb-component-list', { timeout: 10000 });

    cy.intercept({
      method: 'POST',
      pathname: new RegExp(`/mercury-editor/[a-f0-9]{32}/insert/${type}(\\?|$)`),
      times: 1,
    }).as('addComponent');
    // cy.get(`.type-${type} a`).scrollIntoView().should('be.visible');
    cy.get(`.type-${type} a`).click({ force: true });

    // Wait for the add component request to finish.
    // This will result in either:
    // 1. A new component being added to the layout (skipform enabled).
    // 2. A component form being opened (skipform disabled).
    cy.wait('@addComponent', { timeout: 10000 }).then(({ response }) => {
      const skipForm = !response
        .body
        .find(command => command.command === 'openMercuryDialog');
      if (skipForm) {
        cy.log('Skip form enabled, component added directly to layout.');
        cy.intercept({
          method: 'POST',
          pathname: new RegExp(`/mercury-editor/[a-f0-9]{32}/edit/`),
          times: 1,
        }).as('editForm');
        cy.wait('@editForm', { timeout: 10000 }).then(() => {
          cy.get('.layout-paragraphs-component-form.me-autosave-form', { timeout: 10000 });
        });
      } else {
        cy.get('.layout-paragraphs-component-form', { timeout: 10000 });
      }
    });
  });
});

/**
 * Chooses a layout from a list of options when a layout edit form is open.
 *
 * @param {string} layoutId
 *   The machine name of the layout to choose.
 */
Cypress.Commands.add('meChooseLayout', (layoutId) => {
  cy.get('.layout-paragraphs-component-form').then(($form) => {
    const autoSave = $form.hasClass('me-autosave-form');
    cy.intercept({
      method: 'POST',
      pathname: /^(\/[a-z-]*)?\/mercury-editor\/(.*)/,
      times: 1
    }).as('chooseLayout');
    cy.get(`input[value="${layoutId}"] + label`).click();
    cy.wait('@chooseLayout', { timeout: 10000 }).then(({ request }) => {
      const parsed = new URLSearchParams(request.body);
      expect(parsed.get('_triggering_element_name')).to.equal('layout_paragraphs[layout]');
    });
    if (autoSave) {
      cy.log('Auto-save enabled for this component form. Waiting for auto-save to complete.');
      cy.intercept({
        method: 'POST',
        pathname: new RegExp(`/mercury-editor/[a-f0-9]{32}/edit/`),
        times: 1,
      }).as('autoSave');
      cy.wait('@autoSave', { timeout: 10000 }).then(() => {
        cy.get('.layout-paragraphs-component-form').then(($form) => {
          if ($form.find('.form-element.error').length) {
            cy.get('.layout-paragraphs-component-form .form-element.error', { timeout: 10000 });
            cy.log('Error in the form elements after choosing layout.');
          } else {
            cy.iframe('#me-preview').find(`[data-layout="${layoutId}"]`, { timeout: 10000 });
            cy.get('.layout-paragraphs-component-form.me-autosave-form', { timeout: 10000 });
          }
        });
      });
    } else {
      cy.get('.layout-paragraphs-component-form', { timeout: 10000 });
    }
  });
});

/**
 * Saves the component form.
 * Handles two scenarios:
 * 1. Auto-save forms (existing components) - waits for auto-save to complete
 * 2. Manual save forms (new components) - clicks the save button
 */

Cypress.Commands.add('meSaveComponent', () => {
  cy.meCheckForAutoSave('.layout-paragraphs-component-form').then((result) => {
    if (result.autoSave) {
      // Auto-save scenario. Assume the form is saved when there is no me-ajaxing class present on the document body, then return the component.
      cy.log('Auto-save enabled for this component form.');
      cy
        .get('.layout-paragraphs-component-form')
        .should('have.class', 'me-autosave-form');
      cy.get('body').should('not.have.class', 'me-ajaxing');
      const uuid = result.$form.find('input[name="uuid"]').val();
      cy
        .iframe('#me-preview')
        .find(`[data-uuid="${uuid}"]`, { timeout: 10000 })
        .should('have.attr', 'data-active');
      cy
        .iframe('#me-preview')
        .find(`[data-uuid="${uuid}"]`, { timeout: 10000 });
    } else {
      // Manual save scenario - click the save button
      cy.intercept({
        method: 'POST',
        pathname: /^(\/[a-z-]*)?\/mercury-editor\/(.*)/,
        times: 1
      }).as('saveComponent');
      cy.get('mercury-dialog[id^=lpb-dialog-] [slot=footer] .lpb-btn--save').click();
      // Wait for save to complete
      cy.wait('@saveComponent', { timeout: 15000 }).then((xhr) => {

        // Check if there's an error in the form elements
        const errorCommand = xhr.response.body.find(command =>
          command.command === 'insert' &&
          Cypress.$(`<div>${command.data}</div>`).find('.form-element.error').length
        );

        if (errorCommand) {
          cy.get(
            'mercury-dialog[id^=lpb-dialog-] .layout-paragraphs-component-form .form-element.error',
            { timeout: 10000 },
          );
        } else {
          // Find the newly added component
          const mercuryEditorCommand = xhr.response.body.find(command =>
            command.command === 'mercuryEditorEditIframeCommandsWrapper'
          );
          if (!mercuryEditorCommand) {
            throw new Error('Response did not contain mercuryEditorEditIframeCommandsWrapper command.');
          }

          const lpEventCommand = mercuryEditorCommand.commands?.find(command =>
            command.command === 'LayoutParagraphsEventCommand'
          );
          if (!lpEventCommand) {
            const keys = Object.keys(mercuryEditorCommand.commands || {}).join(', ');
            const commands = mercuryEditorCommand.commands?.reduce((acc, cmd) => {
              acc.push(cmd.command);
              return acc;
            }, []).join(', ');
            const data = mercuryEditorCommand.commands?.reduce((acc, cmd) => {
              acc.push(cmd.data);
              return acc;
            }, []).join(', ');
            throw new Error(
              `Response did not contain LayoutParagraphsEventCommand command. Found data: ${data}`
            );
          }

          const uuid = lpEventCommand.componentUuid;
          if (!uuid) {
            throw new Error('LayoutParagraphsEventCommand did not contain componentUuid.');
          }

          // The saved component's edit form should be open in tray.
          cy.get(`[name="uuid"][value="${uuid}"]`, { timeout: 10000 });
          // Find the component in the preview iframe.
          cy.iframe('#me-preview').find(`[data-uuid="${uuid}"][data-active="true"]`, { timeout: 10000 });
        }
      });

    }
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
  cy.get(`mercury-dialog[id^=lpb-dialog-] ${selector}`).then(($field) => {
    const field = $field[0];
    const form = field.closest('form');
    cy.meCheckForAutoSave(form).then((result) => {
      if (result.autoSave) {
        cy.intercept({
          method: 'POST',
          pathname: /^(\/[a-z-]*)?\/mercury-editor\/(.*)/,
          times: 1
        }).as('autosave');
      }
      const editor = form.querySelector(`.ck-content[contenteditable=true]`).ckeditorInstance;
      // Use model.change() to properly trigger change events
      editor.model.change(writer => {
        // Clear existing content
        const root = editor.model.document.getRoot();
        writer.remove(writer.createRangeIn(root));
        // Insert new content using the data processor
        const viewFragment = editor.data.processor.toView(value);
        const modelFragment = editor.data.toModel(viewFragment);
        writer.insert(modelFragment, root, 0);
      });
      if (result.autoSave) {
        cy.wait('@autosave', { timeout: 15000 });
        const uuid = form.querySelector('input[name="uuid"]').value;
        cy.iframe('#me-preview').find(`[data-uuid="${uuid}"]`).contains(value, { timeout: 10000 });
      }
    });
  });
});

/**
 * Visit the Mercury Editor interface using the entity edit URL.
 */
Cypress.Commands.add('meEditPage', () => {
  meGetEntityBasePath().then((entityPath) => {
    cy.visit(`${entityPath}/edit`);
    cy.get('#me-preview').its('0.contentDocument');
  });
});

/**
 * Saves the entity by clicking the `Save` button in the Mercury Editor interface.
 */
Cypress.Commands.add('meSavePage', () => {
  cy.intercept({
    method: 'POST',
    pathname: /^(\/[a-z-]*)?\/mercury-editor\/(.*)/,
    times: 1
  }).as('savePage');
  cy.get('#me-save-btn').click();
  cy.wait('@savePage');
  // Button should say "Saved!" while in progress.
  cy.get('#me-save-btn').should('contain.text', 'Saved!');
  // Button should revert to "Save changes" after save.
  cy.get('#me-save-btn').should('contain.text', 'Save changes');
});

/**
 * Deletes the entity using the entity delete URL.
 * This will open a confirmation dialog, and then delete the entity.
 */
Cypress.Commands.add('meDeletePage', () => {
  meGetEntityBasePath().then((entityPath) => {
    cy.visit(`${entityPath}/delete`);
  });
  cy.get('form.confirmation').should('exist'); // Wait for it to appear
  cy
    .get('form.confirmation')
    .find('input.button--primary:visible')
    .as('deleteButton');
  cy.get('@deleteButton').click();
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
 * @param {string|int} expression
 *   Either The text to search for within the component or the numeric
 *   index of the component to return.
 */
Cypress.Commands.add('meFindComponent', (expression) => {
  cy.get('#me-preview').its('0.contentDocument').then((document) => {
    const component = typeof expression === 'number' ?
      Array.from(document.querySelectorAll('[data-uuid]'))[expression - 1] :
      Array.from(document.querySelectorAll('[data-uuid]'))
        .filter(el => el.textContent.includes(expression))
        .pop();
    cy.meSelectComponent(component.getAttribute('data-uuid'));
  });
});

/**
 * Selects a component by its UUID, activating it if necessary.
 * This will click the component to activate it, and wait for the edit form to load.
 * If the component is already active, it will simply hover over it.
 * This command will retry clicking the component up to 10 times if it is not active.
 * @param {string} uuid The UUID of the component to select.
 * @throws {Error} If the component cannot be activated after 10 attempts.
 **/
Cypress.Commands.add('meSelectComponent', (uuid) => {
  cy.iframe('#me-preview').find(`[data-uuid="${uuid}"]`).then((component) => {
    const clickUntilActive = (i = 0) => {
      if (i > 10) {
        throw new Error(`Failed to activate component with UUID: ${uuid}`);
      }
      cy.get(component).then(($el) => {
        cy.intercept({
          method: 'POST',
          url: /\/mercury-editor\/[a-f0-9]*\/edit|\/mercury-editor\/[a-f0-9-]+\/[a-f0-9-]+\/action\/edit/,
          times: 1,
        }).as('loadEditForm').then(() => {
          $el[0].dispatchEvent(new Event('mouseup', {
            bubbles: true,
            cancelable: true,
          }));
          cy.wait('@loadEditForm');
          // Get the UUID of the currently active component (which may be a parent)
          cy.iframe('#me-preview').find('[data-active="true"]').then(($activeComponent) => {
            const activeUuid = $activeComponent.attr('data-uuid');
            cy.get(`.layout-paragraphs-component-form [name="uuid"][value="${activeUuid}"]`);
            if (activeUuid !== uuid) {
              clickUntilActive(i + 1);
            }
          });
        });;
      });
    };
    if (component.attr('data-active') !== 'true') {
      clickUntilActive();
    }
    cy.get(`[name="uuid"][value="${uuid}"]`, { timeout: 10000 }).should('exist');
    cy.get(component).trigger('mouseover');
    cy.get(component).as('selectedComponent');
    cy.get('@selectedComponent').should('have.attr', 'data-active', 'true');
    cy.get('@selectedComponent').trigger('mouseover', { force: true });
  });
});

/**
 * Delete a component by clicking on it and using the delete control.
 *
 * @param {string|alias} component
 *  The CSS selector or cypress alias for the component to delete.
 */
Cypress.Commands.add('meDeleteComponent', (component) => {
  cy.intercept({
    method: 'POST',
    pathname: /^(\/[a-z-]*)?\/mercury-editor\/(.*)/,
    times: 1
  }).as('confirmDelete');
  // Click on component to focus it and reveal controls
  cy.meSelectComponent(component.attr('data-uuid')).then(() => {
    // Click the delete button that appears in the controls
    cy.get(component).find('.lpb-delete').first().click({ force: true });
    // Confirm deletion in dialog
    cy.get('mercury-dialog[id^=lpb-dialog-] [slot="footer"] .lpb-btn--confirm-delete').click();
    cy.wait('@confirmDelete');
    // Wait until the component is removed from the DOM
    cy.iframe('#me-preview').find(`[data-uuid="${component.attr('data-uuid')}"]`).should('not.exist');
  });

});
