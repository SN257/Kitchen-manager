// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home'; // or './pages/Dashboard'
import Dashboard from './pages/Dashboard';
import AddFoodItem from './pages/AddFoodItem';
import AddIngrediants from './pages/AddIngredient';
import RecipeEntry from './pages/RecipeEntry';
import Login from './pages/login';


const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard/*" element={<Home />}>
      <Route index element={<Dashboard />} />
      <Route path="add-food-item" element={<AddFoodItem />} />
      <Route path="add-ingredient" element={<AddIngrediants />} />
      <Route path="recipe-entry" element={<RecipeEntry />} />
    </Route>
  </Routes>
);

export default App;