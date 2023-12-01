# React component library template/boilerplate

### Development

- Storybook:
  - Storybook gives you an easy way to see and use your components while working on them in your library project, without having to build an unnecessary testing page just to display them.

        ```bash
        npm run storybook # runs the host Storybook application locally for quick and easy testing
        ```

Now, anytime you make a change to your library or the stories, the storybook will live-reload your local dev server so you can iterate on your component in real-time.

- Rollup watch and build:

  - for Local development run rollup to watch your src/ module and automatically recompile it into dist/ whenever you make changes.

        ```bash
        npm run dev # runs rollup with watch flag
        ```

### Scripts

- `npm run build` : builds the library to `dist`
- `npm run dev`  : builds the library, then keeps rebuilding it whenever the source files change.
- `npm test` : tests the library and show the coverage.
- `npm run lint` : runs eslint.
- `npm run storybook` : runs the host Storybook application locally for quick and easy testing
- `npm run build-storybook` : builds a static HTML/JS bundle that can easily be hosted on a remote server, so all members of your team can try your components.
- `npm run deploy-storybook` : build & deploy the storybook to GitHub Pages

### Publishing to npm

publish to GitHub Packages registry:

- you need to have this in your ~/.npmrc

```bash
registry=https://registry.npmjs.org/
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_AUTH_TOKEN
```

and run:

```bash
npm publish
```

## Tutorials and inspirations used to create this boilerplate

- big thanks to this tuto and his author : <https://dev.to/alexeagleson/how-to-create-and-publish-a-react-component-library-2oe#adding-scss>

## License

[MIT](LICENSE).
