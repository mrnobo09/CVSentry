
import {Routes,Route} from 'react-router-dom'
import Login from './screens/login'
import {authProvider} from './contexts/auth'

function App() {
  
  return (
    <authProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </authProvider>
  )
}

export default App
