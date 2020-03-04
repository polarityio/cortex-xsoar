const { _groupEntities } = require("../helpers/getLookupResults");

describe("_groupEntities", () => {
  test("should group entities by the entityType", () => {
    const sampleEntities = [
      { isIP: true, value: "52.109.12.14" },
      { isIP: true, value: "52.123.13.56" },
      { isDomain: true, value: "appllesupport.com" },
      { isDomain: true, value: "google.com" },
      { isEmail: true, value: "Bob.Arg@CST1.com" },
      { isEmail: true, value: "Cyndi.Converse@CST1.com" },
      { value: "asdf" }
    ];

    const expectedOutput = {
      ip: [
        { isIP: true, value: "52.109.12.14" },
        { isIP: true, value: "52.123.13.56" }
      ],
      domain: [
        { isDomain: true, value: "appllesupport.com" },
        { isDomain: true, value: "google.com" }
      ],
      email: [
        { isEmail: true, value: "Bob.Arg@CST1.com" },
        { isEmail: true, value: "Cyndi.Converse@CST1.com" }
      ],
      unknown: [{ value: "asdf" }]
    };

    expect(_groupEntities(sampleEntities)).toEqual(expectedOutput);
  });

  test("should filter out Ignored IPs", () => {
    const sampleEntities = [
      { isIP: true, value: "127.0.0.1" },
      { isIP: true, value: "255.255.255.255" },
      { isIP: true, value: "Not an Ignored IP" }
    ];

    const expectedOutput = {
      ip: [{ isIP: true, value: "Not an Ignored IP" }]
    };

    expect(_groupEntities(sampleEntities)).toEqual(expectedOutput);
  });
});
