f("n","extern","t",true) => {Name,Type,TypeName,Required}
  - ChainName? => chain
  - ctor
f("n","extern","t") => {Name,Type,TypeName}
f("n","type",true,v) => {Name,Type,Required,DefaultValue}
  - ChainName? => chain
  - ManualSet? => manual
  - ctor?