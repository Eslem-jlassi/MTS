import Header from '../components/Header';
import KanbanBoard from "../components/KanbanBoard";
import {LoggedInProps} from "../common/commonTypes";

export default function Home({loggedIn, setLoggedIn} : LoggedInProps) {
    return (
      <div className="home">
          <Header loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
          <KanbanBoard />
      </div>
    );
}
