import Home from './pages/Home';
import QnAPage from './pages/QnAPage';
import NewTicket from './pages/NewTicket';
import MyTickets from './pages/MyTickets';
import OfficeHours from './pages/OfficeHours';
import Dashboard from './pages/Dashboard';
import MyAvailability from './pages/MyAvailability';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "QnAPage": QnAPage,
    "NewTicket": NewTicket,
    "MyTickets": MyTickets,
    "OfficeHours": OfficeHours,
    "Dashboard": Dashboard,
    "MyAvailability": MyAvailability,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};