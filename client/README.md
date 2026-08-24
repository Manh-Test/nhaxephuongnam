# Nha Xe Phuong Nam

Bus booking application with a Node.js/Express API and a React client.

## Requirements

- Node.js and npm
- SQL Server running locally or on an accessible Windows host
- Microsoft ODBC Driver 17 for SQL Server
- Windows authentication enabled for the SQL Server connection

## Configuration

Create a `.env` file in the repository root:

```env
DB_SERVER=localhost
DB_DATABASE=NhaXePhuongNam
PORT=5001
jwt_secret=replace-with-a-long-random-secret
stripe_key=replace-with-your-stripe-secret-key
```

`DB_SERVER` and `DB_DATABASE` default to `localhost` and `NhaXePhuongNam`, so they can be omitted when using those values.

## Install

From the repository root in PowerShell:

```powershell
npm install
npm run client-install
```

Initialize the database tables once:

```powershell
npm run init-db
```

If the database already exists and needs the latest optional columns, run:

```powershell
node config/fixSchema.js
node config/migrateStops.js
node config/migrateDriver.js
```

## Run In Development

Start the API and React development server together:

```powershell
npm run dev
```

The API listens on `http://localhost:5001` and the React client normally opens at `http://localhost:3000`.

To run them separately:

```powershell
npm run server
npm run client
```

## Production Build

Build the React client:

```powershell
npm run build --prefix client
```

Run the API in production mode so Express serves the built client:

```powershell
$env:NODE_ENV="production"
npm start
```
