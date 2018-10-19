/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "chai";
import { initServer } from "./initServer";

describe("Integration", () => {
  describe("Language syntax", () => {
    it("destructuring and await", async () => {
      const stdout = await initServer("destructuring-and-await");

      expect(stdout.length).toBe(4);
    });

    it("generators", async () => {
      const stdout = await initServer("generators");

      expect(stdout.length).toBe(4);
    });

    it("object spread", async () => {
      const stdout = await initServer("object-spread");

      expect(stdout.length).toBe(4);
    });

    it("rest + default", async () => {
      const stdout = await initServer("rest-and-default");

      expect(stdout.length).toBe(4);
    });
  });
});
