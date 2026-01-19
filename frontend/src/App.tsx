import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Participants from './components/Participants';
import Groups from './components/Groups';
import GroupDetails from './components/GroupDetails';
import Payments from './components/Payments';
import Games from './components/Games';
import PrizeManagement from './components/PrizeManagement';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="participants" element={<Participants />} />
                <Route path="groups" element={<Groups />} />
                <Route path="groups/:id" element={<GroupDetails />} />
                <Route path="groups/:id/payments" element={<Payments />} />
                <Route path="groups/:id/games" element={<Games />} />
                <Route path="groups/:id/prizes" element={<PrizeManagement />} />
            </Route>
        </Routes>
    );
}

export default App;
