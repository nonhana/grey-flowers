export default defineEventHandler((event) => {
  return {
    hello: 'world',
    eventInfo: event,
  }
})
