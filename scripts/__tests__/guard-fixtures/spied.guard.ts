it("expects its own error and asserts on it", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  console.error("expected");
  expect(spy).toHaveBeenCalledWith("expected");
});
