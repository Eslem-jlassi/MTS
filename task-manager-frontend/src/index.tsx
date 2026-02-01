import React, {ErrorInfo} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tailwind.css';
import './bootstrap.css';
import './index.css';
import './App.css';
import store from "./redux/store";
import {Provider} from "react-redux";
import {ErrorBoundary} from "react-error-boundary";
import ErrorPage from "./pages/ErrorPage";

function handleError(error: Error, info: ErrorInfo) {
    console.error("Caught an error:", error, info);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
      <ErrorBoundary FallbackComponent={ErrorPage} onError={handleError}>
          <Provider store={store}>
              <App />
          </Provider>
      </ErrorBoundary>
  </React.StrictMode>
);
