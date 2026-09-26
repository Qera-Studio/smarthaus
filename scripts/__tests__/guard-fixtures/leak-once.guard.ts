it("leaks", () => {
  console.error("first test leaks");
});
it("is clean and must not inherit the previous test's output", () => {
  expect(true).toBe(true);
});
