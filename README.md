# Mercury Editor Cypress Commands

This repository contains a set of [Cypress](https://www.cypress.io/) commands designed to interact with Drupal's [Mercury Editor](https://www.drupal.org/project/mercury_editor) module. These commands allow you to automate various tasks when working with the Mercury Editor, such as adding components, choosing layouts, editing content, and more.

## Version Compatibility

**Version 3.x** (for Mercury Editor 3.x and Layout Paragraphs 3.x):
- Uses click-based interactions instead of hover
- Auto-save functionality - forms are automatically saved when changed
- New focused/blurred component states
- Updated CSS selectors and DOM structure

**Version 2.x** (for Mercury Editor 2.x and Layout Paragraphs 2.x):
- Uses hover-based interactions
- Manual save required via save button
- Classic hover states for components

## Installation

To use these Cypress commands in your project, follow these installation steps:

1. **Install the commands**: This assumes you already have Cypress installed and running. Choose the appropriate version based on the version of the `mercury_editor` Drupal module you are using:

   - For `mercury_editor` 2.x, install version 2 of `cypress-mercury-editor`:

     ```bash
     npm install cypress-mercury-editor@2 --save-dev
     ```

   - For `mercury_editor` 3.x, install version 3 of `cypress-mercury-editor`:

     ```bash
     npm install cypress-mercury-editor@3 --save-dev
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

Saves the component form. Automatically handles both scenarios:
- **New components**: Clicks the save button to add the component to the page
- **Existing components**: Waits for auto-save to complete when editing

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

Finds a component that contains the given text or returns a component by its numeric index.

```javascript
cy.meFindComponent(expression);
```

- `expression` (string|number): Either the text to search for within the component or the numeric index of the component to return (1-based).

### `meSelectComponent`

Selects a component by its UUID, activating it if necessary. This will click the component to activate it and wait for the edit form to load. If the component is already active, it will simply hover over it.

```javascript
cy.meSelectComponent(uuid);
```

- `uuid` (string): The UUID of the component to select.

### `meDeleteComponent`

Deletes a component by clicking the delete button on an existing paragraph.

```javascript
cy.meDeleteComponent(component);
```

- `component` (string or alias): The CSS selector or Cypress alias for the component to delete.

### `meCheckForAutoSave` (Internal)

An internal helper command that checks if a given form has auto-save enabled. This command is used internally by other commands and typically doesn't need to be called directly in tests.

```javascript
cy.meCheckForAutoSave(form);
```

- `form` (string): The CSS selector for the form to check.

Returns a promise that resolves with an object containing:
- `autoSave`: boolean indicating if auto-save is enabled
- `data`: the serialized data if auto-save is enabled, otherwise null
- `$form`: the jQuery object of the form

## Version 3.x Changes Summary

For Mercury Editor 3.x and Layout Paragraphs 3.x, several key behavioral changes have been implemented:

1. **Click-based Interactions**: Components are now activated by clicking instead of hovering
2. **Updated CSS Classes**: Component forms now use `.layout-paragraphs-component-form` class for Layout Paragraphs components
3. **Smart Save Handling**: The `meSaveComponent` command now intelligently handles both manual save (new components) and auto-save (existing components) scenarios
4. **Component States**: Components now use `.focused` and `.blurred` classes instead of hover states
5. **DOM Updates**: Updated CSS selectors and form element locations

**Important**: Mercury Editor uses two different form types:
- `.me-entity-form` - for editing the main entity/page
- `.layout-paragraphs-component-form` - for editing individual Layout Paragraphs components (which is what Mercury Editor primarily handles)

The Cypress commands in this package target `.layout-paragraphs-component-form` since they're designed for component editing workflows.

These changes make the interface more touch-friendly and provide a smoother editing experience.

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
      cy.meSetCKEditor5Value('me_test_text', 'Left - edited');
      cy.meSaveComponent().then((component) => {
        cy.wrap(component).should('contain', 'Left - edited');
      });
    });

    cy.meFindComponent('Right').then((component) => {
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
