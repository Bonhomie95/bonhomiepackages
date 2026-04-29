export const required = (value) =>
  value ? true : { required: "This field is required" };
