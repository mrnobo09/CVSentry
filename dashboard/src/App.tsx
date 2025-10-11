import { useState,useEffect} from 'react'
import request from './actions/request'

function App() {
  const [data,setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
    try {
      const result = await request.get('/auth/');
      setData(result);
      console.log('Fetched data:', result);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
    fetchData();
  }, []);

  
  return (
    <>
      <h1 className='text-[#646cff]'>{data}</h1>
    </>
  )
}

export default App
