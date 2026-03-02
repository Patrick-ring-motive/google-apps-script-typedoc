(()=>{
  const Q = fn => {
        try {
            return fn?.()
        } catch {}
    };
    const constructPrototype = newClass => {
        try {
            if (newClass?.prototype) return newClass;
            const constProto = newClass?.constructor?.prototype;
            if (constProto) {
                newClass.prototype = Q(() => constProto?.bind?.(constProto)) ?? Object.create(Object(constProto));
                return newClass;
            }
            newClass.prototype = Q(() => newClass?.bind?.(newClass)) ?? Object.create(Object(newClass));
        } catch (e) {
            console.warn(e, newClass);
        }
    };
    const extend = (thisClass, superClass) => {
        try {
            constructPrototype(thisClass);
            constructPrototype(superClass);
            Object.setPrototypeOf(
                thisClass.prototype,
                superClass?.prototype ??
                superClass?.constructor?.prototype ??
                superClass
            );
            Object.setPrototypeOf(thisClass, superClass);

        } catch (e) {
            console.warn(e, {
                thisClass,
                superClass
            });
        }
        return thisClass;
    };
  const SpreadSheetHandles = new Map();
  
  SpreadsheetApp.openByName = function openByName(name) {
    try{
      let sheet = SpreadSheetHandles.get(name);
      if(sheet) return sheet;
      const files = DriveApp.getFilesByName(name);
      if(files.hasNext()){
        const file = files.next();
        sheet = SpreadsheetApp.open(file);
        if(sheet){
          SpreadSheetHandles.set(file,sheet);
          SpreadSheetHandles.set(sheet.getId(),sheet);
          SpreadSheetHandles.set(sheet.getName(),sheet);
          SpreadSheetHandles.set(sheet.getUrl(),sheet);
        }
      }
      return sheet;
    }catch{
      return null;
    }
  };
  (()=>{
    const _open = SpreadsheetApp.open
    SpreadsheetApp.open = extend(function open(input) {
      try {
        if(SpreadSheetHandles.has(input))return SpreadSheetHandles.get(input);
        if (input?.getId) return _open(input);
        if (/^https?:\/\//.test(input)) return SpreadsheetApp.openByUrl(input);
        if (/^[a-zA-Z0-9_-]{25,}$/.test(input)) return SpreadsheetApp.openById(input);
        return Spreadsheet.openByName(input);
      } catch(e) {
        return null;
      }
    },_open);
  })();
  (()=>{
    const _openById = SpreadsheetApp.openById;
    SpreadsheetApp.openById = extend(function openById(input) {
      try {
        if(SpreadSheetHandles.has(input))return SpreadSheetHandles.get(input);
        const sheet = _openById(input);
        if(sheet){
          SpreadSheetHandles.set(input,sheet);
          SpreadSheetHandles.set(sheet.getName(),sheet);
          SpreadSheetHandles.set(sheet.getUrl(),sheet);
        }
        return sheet;
      } catch(e) {
        return null;
      }
    },_openById);
  })();
  (()=>{
    const _openByUrl = SpreadsheetApp.openByUrl;
    SpreadsheetApp.openByUrl = extend(function openByUrl(input) {
      try {
        if(SpreadSheetHandles.has(input))return SpreadSheetHandles.get(input);
        const sheet = _openByUrl(input);
        if(sheet){
          SpreadSheetHandles.set(sheet.getId(),sheet);
          SpreadSheetHandles.set(sheet.getName(),sheet);
          SpreadSheetHandles.set(input,sheet);
        }
        return sheet;
      } catch(e) {
        return null;
      }
    },_openByUrl);
  })();
  (()=>{
    const _create = SpreadsheetApp.create
    SpreadsheetApp.create = extend(function create(name,rows,columns) {
      try {
        if(rows == undefined && columns == undefined){
          return _create(name);
        }
        rows = rows ?? 100;
        columns = columns ?? 26;
        return _create(names,rows,columns);
      } catch(e) {
        return null;
      }
    },_create);
  })();
})();
