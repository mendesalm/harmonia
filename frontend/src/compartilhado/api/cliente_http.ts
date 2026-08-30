import axios from 'axios';

export const clienteHttp = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default clienteHttp;
