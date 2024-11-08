export function wait(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}

export function convertToJsonAttribute(str) {
    // Step 1: Remove any parentheses and their content
    let noParentheses = str.replace(/\(.*?\)/g, '');
  
    // Step 2: Trim whitespace and replace spaces with underscores
    let jsonAttribute = noParentheses.trim().replace(/\s+/g, '_');
  
    // Step 3: Convert to lowercase to follow common JSON key format
    jsonAttribute = jsonAttribute.toLowerCase();
  
    return jsonAttribute;
}

export function convertToThreeDigitID(idx) {
    return `${Math.floor(idx/100)}${Math.floor(idx/10)%10}${idx%10}`
}

export function getDateDifference(date) {
    const today = new Date();
    const timeDifference = Math.abs(date - today);
    const dayDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    
    return dayDifference;
}