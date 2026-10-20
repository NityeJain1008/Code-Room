import logo from './logo.svg';
import './App.css';
import Home from "./component/Home"
import {Routes, Route} from "react-router-dom";
import EditorPage from './component/EditorPage';


function App() {
  return (
    <>
      <Routes>
          <Route path = "/" element = {<Home />} />
          <Route path = "/editor/:roomId" element = {<EditorPage />} />
      </Routes>
    </>
  );
}

export default App;
