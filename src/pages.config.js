import Home from './pages/Home';
import QnAPage from './pages/QnAPage';
import NewTicket from './pages/NewTicket';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "QnAPage": QnAPage,
    "NewTicket": NewTicket,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};