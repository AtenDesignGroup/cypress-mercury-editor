# Mercury Editor Cypress Commands

This repository contains a set of [Cypress](https://www.cypress.io/) commands designed to interact with Drupal's [Mercury Editor](https://www.drupal.org/project/mercury_editor) module. These commands allow you to automate various tasks when working with the Mercury Editor, such as adding components, choosing layouts, editing content, and more.

## Installation

To use these Cypress commands in your project, follow these installation steps:

1. **Install the commands**: This assumes you already have Cypress installed and running:

   ```bash
   npm install cypress-mercury-editor --save-dev
   ```

4. **Use in Tests**: You can now use these commands in your Cypress tests by importing them in individual tests or globally inside your /support/commands.js file:

    ```javascript
    import 'cypress-mercury-editor';
    ```
You don't need to access the commands directly

## Cypress Commands

### `meAddComponent`

Opens the "Add component" dialog for a layout-enabled paragraph component.

```javascript
cy.meAddComponent(type, options);
```

- `type` (string): The machine name of the layout-enabled paragraph type (e.g., "section").
- `options` (object, optional): Additional options for adding the component. You can specify the section, region, before, or after where the component should be added.
- `options.section` (string) The CSS selector for an existing section to add the component to. Used in conjunction with `options.region`.
- `options.region` (string) The machine name of the region to add the component to. Used in conjunction with `options.section`.
- `options.before` (string) The CSS selector for an existing component to add the new component before.
- `options.after` (string) The CSS selector for an existing component to add the new component after.

### `meChooseLayout`

Chooses a layout from a list of options when a layout edit form is open.

```javascript
cy.meChooseLayout(layoutId);
```

- `layoutId` (string): The machine name of the layout to choose.

### `meSaveComponent`

Clicks the save button on an open add or edit component dialog.

```javascript
cy.meSaveComponent();
```

### `meSetCKEditor5Value`

Sets the value of a CKEditor5 Field.

```javascript
cy.meSetCKEditor5Value(fieldName, value);
```

- `fieldName` (string): The machine name of the field containing a CKEditor5 widget.
- `value` (string): The text or HTML value to set within the CKEditor5 field widget.

### `meEditPage`

Visits the Mercury Editor interface by clicking the "Edit" link on an entity view page.

```javascript
cy.meEditPage();
```

### `meSavePage`

Saves the entity by clicking the "Save" button in the Mercury Editor interface.

```javascript
cy.meSavePage();
```

### `meDeletePage`

Deletes the entity by clicking the "Delete" button in the Mercury Editor interface.

```javascript
cy.meDeletePage();
```

### `meExitEditor`

Exits the editor by clicking the "Done" button.

```javascript
cy.meExitEditor();
```

### `meFindComponent`

Finds a component that contains the given text.

```javascript
cy.meFindComponent(text);
```

- `text` (string): The text to search for within the component.

### `meEditComponent`

Opens the edit component dialog by clicking the edit button on an existing paragraph.

```javascript
cy.meEditComponent(component);
```

- `component` (string or alias): The CSS selector or Cypress alias for the component to edit.

### `meDeleteComponent`

Deletes a component by clicking the delete button on an existing paragraph.

```javascript
cy.meDeleteComponent(component);
```

- `component` (string or alias): The CSS selector or Cypress alias for the component to delete.

## Usage

To use these Cypress commands in your tests, simply import them and call the desired command with the appropriate parameters. For example:

```javascript
import 'cypress-iframe';

// Import the Mercury Editor Cypress commands
import 'cypress-mercury-editor';

it('creates, edits, and deletes a node with Mercury Editor', () => {
    // Create a new page.
    cy.visit('/node/add/me_test_ct');
    cy.get('#edit-title-0-value').clear().type('-- Test page --');
    // Tests that syncing the title field works.
    cy.get('input[name="title[0][value]"]').clear().type('-- Test page --');
    cy.iframe('#me-preview').find('.page-title').contains(' -- Test page --');

    cy.meAddComponent('me_test_section');
    cy.meChooseLayout('layout_twocol');
    cy.meSaveComponent().then((section) => {
      cy.meAddComponent('me_test_text', {
        region: 'first',
        section
      });
      cy.meSetCKEditor5Value('me_test_text', 'Left');
      cy.meSaveComponent().then((component) => {
        cy.wrap(component).should('contain', 'Left');
      });

      cy.meAddComponent('me_test_text', {
        region: 'second',
        section
      });
      cy.meSetCKEditor5Value('me_test_text', 'Right');
      cy.meSaveComponent().then((component) => {
        cy.wrap(component).should('contain', 'Right');
      });
    });

    cy.meSavePage();
    cy.meExitEditor();

    cy.meEditPage();
    cy.meFindComponent('Left').then((component) => {
      cy.meEditComponent(component);
      cy.meSetCKEditor5Value('me_test_text', 'Left - edited');
      cy.meSaveComponent().then((component) => {
        cy.wrap(component).should('contain', 'Left - edited');
      });
    });

    cy.meFindComponent('Right').then((component) => {
      cy.meEditComponent(component);
      cy.meSetCKEditor5Value('me_test_text', 'Right - edited');
      cy.meSaveComponent().then((component) => {
        cy.wrap(component).should('contain', 'Right - edited');
      });
    });

    cy.iframe('#me-preview').find('[data-type="me_test_section"]').first().then((section) => {
      cy.meAddComponent('me_test_section', { after: section });
      cy.meChooseLayout('layout_threecol_33_34_33');
      cy.meSaveComponent().then((section) => {

        cy.meAddComponent('me_test_text', {
          region: 'first',
          section
        });
        cy.meSetCKEditor5Value('me_test_text', 'Bottom left');
        cy.meSaveComponent().then((component) => {
          cy.wrap(component).should('contain', 'Bottom left');
        });

        cy.meAddComponent('me_test_text', {
          region: 'second',
          section
        });
        cy.meSetCKEditor5Value('me_test_text', 'Bottom center');
        cy.meSaveComponent().then((component) => {
          cy.wrap(component).should('contain', 'Bottom center');
        });;

        cy.meAddComponent('me_test_text', {
          region: 'third',
          section
        });
        cy.meSetCKEditor5Value('me_test_text', 'Bottom right');
        cy.meSaveComponent().then((component) => {
          cy.wrap(component).should('contain', 'Bottom right');
        });;
      });
      cy.meSavePage();
      cy.meExitEditor();
      cy.meDeletePage();
    });
  });
```

## License

This project is licensed under the [MIT License](LICENSE).
```

You can copy and paste this Markdown code into a `README.md` file in your project for clear documentation.
