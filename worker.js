importScripts('//cdn.jsdelivr.net/npm/@magenta/image@0.2.1/dist/magentaimage.min.js');

console.log('in worker')
  self.addEventListener('message', async function(e) {

    model2 = new mi.ArbitraryStyleTransferNetwork();
    await model2.initialize()
    let d = await model2.stylize(e.data.c, e.data.s);
    console.log(d)
    self.postMessage(d);

  }, false);