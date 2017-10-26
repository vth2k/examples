//es2015 implementation
function sumES6(...oargs) {
   let total = 0;
 
   function summator(...args) {
    total += args.reduce((r, e) => r + e);
    
    return summator; 
   }
   
   summator.valueOf = () => total;

   return summator(...oargs);
}

//es5 implementation
function sumES5() {
  var total = 0;
  
  function summator() {
      total += [].reduce.call(arguments, function(a, b) {
        return +a + b;
      });
      
    return summator;
  }
  
  summator.valueOf = function(){return total;};
  
  return summator.apply(this, arguments);
}
