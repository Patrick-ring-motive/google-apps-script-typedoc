(()=>{
  const SpreadSheetHandles = new Map();
  const Spreadsheet = class Spreadsheet extends SpreadsheetApp.create {

  static openByName(name) {
    try{
      let sheet = SpreadSheetHandles.get(name);
      if(sheet) return sheet;
      const files = DriveApp.getFilesByName(name);
      sheet = files.hasNext() 
        ? SpreadsheetApp.open(files.next()) 
        : null;
      SpreadSheetHandles.set(sheet.getId(),sheet);
      SpreadSheetHandles.set(sheet.getName(),sheet);
      return sheet;
    }catch{
      return null;
    }
  }

  static open(input) {
    try {
      if (input?.getId) return SpreadsheetApp.open(input);
      if (/^https?:\/\//.test(input)) return SpreadsheetApp.openByUrl(input);
      if (/^[a-zA-Z0-9_-]{25,}$/.test(input)) return SpreadsheetApp.openById(input);
      return Spreadsheet.openByName(input);
    } catch(e) {
      return null;
    }
  }

  constructor(input, rows, cols) {
    let $this;
    try {
      $this = Spreadsheet.open(input) 
        ?? (rows !== undefined 
          ? super(input, rows, cols) 
          : super(input));
    } catch(e) {
      throw e;
    }
    return Object.setPrototypeOf($this, Spreadsheet.prototype);
  }
};
})();
