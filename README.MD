Add a screenshot to Pendo tag pages/features

Tagged pages and features in VDS will capture a screenshot.

When naviagating to page and features details page a screenshot will be appended to the header.

Screenshots are saved in localstorage. Deleting the extension will flush all local storage.

Clicking on the extension Icon will show a list of captured tags.

Export / Import captured tags.

To control permissions this extension should run on, maually edit the Host permissions setting in manifest.json and reload the extension.
 
 `"host_permissions": ["<all_urls>"]`


## Todo:

- [ ] Better handling of image data #5
  - [ ] use some sort of db to store data instead of localstorage?
  - [ ] compress image


- [X] Split tag data by Sub ID
  - [X] Support Exporting tags with Sub ID


