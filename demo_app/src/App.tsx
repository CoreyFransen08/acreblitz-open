import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { WeatherDemo } from './pages/WeatherDemo';
import { MapDemo } from './pages/MapDemo';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="weather" element={<WeatherDemo />} />
        <Route path="map" element={<MapDemo />} />
      </Route>
    </Routes>
  );
}
