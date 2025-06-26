1. clone repository
2. run command "npm install" in both folder
3. setup postgres database at your local
4. create .env file in backend folder and paste "DATABASE_URL=postgres://your_Username:your_password@localhost:5432/your_dbname"
5. generate migration by run command in backend folder "npm run migration:generate"
6. run migration by run command backend folder "npm run migration:run"
