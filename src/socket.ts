// import { io } from 'socket.io-client'

// console.log({ host: import.meta.env.VITE_API_HOST })
// export const socketClient = io(import.meta.env.VITE_API_HOST)
// export const storageSocket = io(import.meta.env.VITE_MEDIA_API_HOST) // io(import.meta.env.VITE_MEDIA_API_HOST)
// export const inspectionSocket = io(import.meta.env.VITE_API_HOST + '/inspections')

export const socketClient = []
export const storageSocket = {}
export const inspectionSocket = {}