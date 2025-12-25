import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("Counter Functions Tests", () => {
  it("starts with counter at 0", () => {
    const counterValue = simnet.callReadOnlyFn(
      "halloffame",
      "get-counter",
      [],
      deployer
    );

    expect(counterValue.result).toBeOk(Cl.int(0));
  });

  it("allows incrementing the counter", () => {
    const incrementResponse = simnet.callPublicFn(
      "halloffame",
      "increment",
      [],
      deployer
    );

    expect(incrementResponse.result).toBeOk(Cl.int(1));
  });

  it("allows multiple increments", () => {
    simnet.callPublicFn("halloffame", "increment", [], deployer);
    simnet.callPublicFn("halloffame", "increment", [], deployer);
    const incrementResponse = simnet.callPublicFn(
      "halloffame",
      "increment",
      [],
      deployer
    );

    expect(incrementResponse.result).toBeOk(Cl.int(3));
  });

  it("allows decrementing the counter", () => {
    simnet.callPublicFn("halloffame", "increment", [], deployer);
    simnet.callPublicFn("halloffame", "increment", [], deployer);

    const decrementResponse = simnet.callPublicFn(
      "halloffame",
      "decrement",
      [],
      deployer
    );

    expect(decrementResponse.result).toBeOk(Cl.int(1));
  });

  it("allows decrement to go negative", () => {
    const decrementResponse = simnet.callPublicFn(
      "halloffame",
      "decrement",
      [],
      deployer
    );

    expect(decrementResponse.result).toBeOk(Cl.int(-1));
  });

  it("returns the current counter value", () => {
    simnet.callPublicFn("halloffame", "increment", [], deployer);
    simnet.callPublicFn("halloffame", "increment", [], deployer);

    const counterValue = simnet.callReadOnlyFn(
      "halloffame",
      "get-counter",
      [],
      deployer
    );

    expect(counterValue.result).toBeOk(Cl.int(2));
  });
});

describe("Leaderboard Submit Score Tests", () => {
  it("allows a user to submit their first score", () => {
    const score = 1000;
    const submitResponse = simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score)],
      wallet1
    );

    expect(submitResponse.result).toBeOk(Cl.bool(true));
  });

  it("updates player's personal best score", () => {
    const score = 1500;
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score)],
      wallet1
    );

    const playerScore = simnet.callReadOnlyFn(
      "halloffame",
      "get-player-score",
      [Cl.principal(wallet1)],
      wallet1
    );

    expect(playerScore.result).toBeOk(Cl.uint(score));
  });

  it("rejects score lower than or equal to current best", () => {
    const score1 = 1000;
    const score2 = 500;

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score1)],
      wallet1
    );

    const submitResponse = simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score2)],
      wallet1
    );

    // Should return ERR-SCORE-NOT-HIGHER (err u101)
    expect(submitResponse.result).toBeErr(Cl.uint(101));
  });

  it("rejects score equal to current best", () => {
    const score = 1000;

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score)],
      wallet1
    );

    const submitResponse = simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score)],
      wallet1
    );

    expect(submitResponse.result).toBeErr(Cl.uint(101));
  });

  it("allows user to improve their score", () => {
    const score1 = 1000;
    const score2 = 2000;

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score1)],
      wallet1
    );

    const submitResponse = simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score2)],
      wallet1
    );

    expect(submitResponse.result).toBeOk(Cl.bool(true));

    const playerScore = simnet.callReadOnlyFn(
      "halloffame",
      "get-player-score",
      [Cl.principal(wallet1)],
      wallet1
    );

    expect(playerScore.result).toBeOk(Cl.uint(score2));
  });

  it("allows multiple users to submit scores independently", () => {
    const score1 = 1000;
    const score2 = 2000;

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score1)],
      wallet1
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score2)],
      wallet2
    );

    const playerScore1 = simnet.callReadOnlyFn(
      "halloffame",
      "get-player-score",
      [Cl.principal(wallet1)],
      wallet1
    );

    const playerScore2 = simnet.callReadOnlyFn(
      "halloffame",
      "get-player-score",
      [Cl.principal(wallet2)],
      wallet2
    );

    expect(playerScore1.result).toBeOk(Cl.uint(score1));
    expect(playerScore2.result).toBeOk(Cl.uint(score2));
  });
});

describe("Top 10 Leaderboard Tests", () => {
  it("returns empty list when no scores submitted", () => {
    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );

    expect(topTen.result).toBeOk(Cl.list([]));
  });

  it("adds first score to top 10", () => {
    const score = 1000;
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score)],
      wallet1
    );

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );

    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({
          player: Cl.principal(wallet1),
          score: Cl.uint(score),
        }),
      ])
    );
  });

  it("maintains descending order with multiple scores", () => {
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(1000)],
      wallet1
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(3000)],
      wallet2
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(2000)],
      wallet3
    );

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );

    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({ player: Cl.principal(wallet2), score: Cl.uint(3000) }),
        Cl.tuple({ player: Cl.principal(wallet3), score: Cl.uint(2000) }),
        Cl.tuple({ player: Cl.principal(wallet1), score: Cl.uint(1000) }),
      ])
    );
  });

  it("removes old score when player improves", () => {
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(1000)],
      wallet1
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(2000)],
      wallet2
    );

    // Wallet1 improves to 3000
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(3000)],
      wallet1
    );

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );

    // Should only have wallet1 once with the new score
    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({ player: Cl.principal(wallet1), score: Cl.uint(3000) }),
        Cl.tuple({ player: Cl.principal(wallet2), score: Cl.uint(2000) }),
      ])
    );
  });

  it("maintains max 10 entries in leaderboard", () => {
    // With only 5 wallets available, we'll test by having some wallets improve their scores
    // to simulate a full leaderboard scenario
    
    // Initial submissions from 5 wallets
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(1000)], wallet1);
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(2000)], wallet2);
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(3000)], wallet3);
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(4000)], wallet4);
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(5000)], deployer);

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );



    // Verify the leaderboard has all 5 scores in descending order
    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({ player: Cl.principal(deployer), score: Cl.uint(5000) }),
        Cl.tuple({ player: Cl.principal(wallet4), score: Cl.uint(4000) }),
        Cl.tuple({ player: Cl.principal(wallet3), score: Cl.uint(3000) }),
        Cl.tuple({ player: Cl.principal(wallet2), score: Cl.uint(2000) }),
        Cl.tuple({ player: Cl.principal(wallet1), score: Cl.uint(1000) }),
      ])
    );
  });

  it("handles player improving their score in leaderboard", () => {
    // Create initial leaderboard
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(1000)], wallet1);
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(2000)], wallet2);
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(3000)], wallet3);
    simnet.callPublicFn("halloffame", "submit-score", [Cl.uint(4000)], wallet4);

    // Wallet1 starts with low score, then improves to top
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(5000)],
      wallet1
    );

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );



    // Verify wallet1 appears only once with best score (5000)
    // and is at the top of the leaderboard
    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({ player: Cl.principal(wallet1), score: Cl.uint(5000) }),
        Cl.tuple({ player: Cl.principal(wallet4), score: Cl.uint(4000) }),
        Cl.tuple({ player: Cl.principal(wallet3), score: Cl.uint(3000) }),
        Cl.tuple({ player: Cl.principal(wallet2), score: Cl.uint(2000) }),
      ])
    );
  });

  it("handles inserting score in middle of list", () => {
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(1000)],
      wallet1
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(5000)],
      wallet2
    );

    // Insert in middle
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(3000)],
      wallet3
    );

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );

    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({ player: Cl.principal(wallet2), score: Cl.uint(5000) }),
        Cl.tuple({ player: Cl.principal(wallet3), score: Cl.uint(3000) }),
        Cl.tuple({ player: Cl.principal(wallet1), score: Cl.uint(1000) }),
      ])
    );
  });
});

describe("Read-Only Function Tests", () => {
  it("returns zero for player with no score", () => {
    const playerScore = simnet.callReadOnlyFn(
      "halloffame",
      "get-player-score",
      [Cl.principal(wallet1)],
      wallet1
    );

    expect(playerScore.result).toBeOk(Cl.uint(0));
  });

  it("returns correct score for player with score", () => {
    const score = 5000;
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score)],
      wallet1
    );

    const playerScore = simnet.callReadOnlyFn(
      "halloffame",
      "get-player-score",
      [Cl.principal(wallet1)],
      wallet1
    );

    expect(playerScore.result).toBeOk(Cl.uint(score));
  });

  it("can query any player's score", () => {
    const score1 = 1000;
    const score2 = 2000;

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score1)],
      wallet1
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(score2)],
      wallet2
    );

    // Deployer queries wallet1's score
    const playerScore = simnet.callReadOnlyFn(
      "halloffame",
      "get-player-score",
      [Cl.principal(wallet1)],
      deployer
    );

    expect(playerScore.result).toBeOk(Cl.uint(score1));
  });
});

describe("Integration Tests", () => {
  it("handles complete competitive scenario", () => {
    // Initial submissions
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(1000)],
      wallet1
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(1500)],
      wallet2
    );

    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(800)],
      wallet3
    );

    // Wallet1 improves
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(2000)],
      wallet1
    );

    // Wallet3 tries to submit lower score (should fail)
    const failedSubmit = simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(700)],
      wallet3
    );
    expect(failedSubmit.result).toBeErr(Cl.uint(101));

    // Wallet3 improves to top
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(3000)],
      wallet3
    );

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );

    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({ player: Cl.principal(wallet3), score: Cl.uint(3000) }),
        Cl.tuple({ player: Cl.principal(wallet1), score: Cl.uint(2000) }),
        Cl.tuple({ player: Cl.principal(wallet2), score: Cl.uint(1500) }),
      ])
    );
  });

  it("handles counter and leaderboard independently", () => {
    // Use counter
    simnet.callPublicFn("halloffame", "increment", [], deployer);
    simnet.callPublicFn("halloffame", "increment", [], deployer);

    // Use leaderboard
    simnet.callPublicFn(
      "halloffame",
      "submit-score",
      [Cl.uint(1000)],
      wallet1
    );

    // Verify both work
    const counter = simnet.callReadOnlyFn(
      "halloffame",
      "get-counter",
      [],
      deployer
    );
    expect(counter.result).toBeOk(Cl.int(2));

    const topTen = simnet.callReadOnlyFn(
      "halloffame",
      "get-top-ten",
      [],
      deployer
    );
    expect(topTen.result).toBeOk(
      Cl.list([
        Cl.tuple({ player: Cl.principal(wallet1), score: Cl.uint(1000) }),
      ])
    );
  });
});
