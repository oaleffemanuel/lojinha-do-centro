# Lojinha do Centro

Public static storefront for the bookstore inside Centro Cultural Itacolomy.

## Local development

```bash
npm ci
npm test
npm run test:covers
npm run lint
npm run typecheck
npm run build
npm start
```

The static preview is available at `http://127.0.0.1:3200`. The storefront
does not require PostgreSQL, an API, authentication, or an external service.

## Public catalog

The build contains 1,118 real books: 558 Cultor titles and 560 Quadrante
titles. It includes 215 verified covers and editorial placeholders for books
without a verified cover. Catalog data contains only public shopping fields:
title, author, publisher, category, ISBN, price, and availability.

The customer flow is catalog → localStorage cart → WhatsApp. Prices are stored
in integer cents and displayed in Brazilian reais. Opening WhatsApp does not
claim that the store received or confirmed the order.

## GitHub Pages

Production URL: `https://oaleffemanuel.github.io/lojinha-do-centro/`

The workflow in `.github/workflows/deploy-pages.yml` runs on pushes to `main`:
it installs dependencies, runs storefront checks, builds the static export,
and deploys only `out/` through GitHub Pages. Set the repository Pages source
to **GitHub Actions** under **Settings → Pages**.

GitHub Pages builds use `basePath: /lojinha-do-centro`; local development uses
the root path. Book pages use trailing slashes for direct access on Pages.

Future catalog or cover updates should be copied from the validated public
storefront in the private development repository, after checking that no
administrative, financial, customer, database, or environment files are
included.

## Configuration

`WHATSAPP_NUMBER` is optional and defaults to `5531975965032`. It is embedded
in the public build, so it is not a secret. Do not add `.env.local` or other
credentials to this repository.
