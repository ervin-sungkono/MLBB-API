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