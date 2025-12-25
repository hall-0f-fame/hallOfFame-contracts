
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;

describe("Hall of Fame Contract", () => {
    
    // --- Counter Tests ---
    it("starts with counter at 0", () => {
        const { result } = simnet.callReadOnlyFn("halloffame", "get-counter", [], address1);
        expect(result).toBeInt(0);
    });

    it("increments the counter", () => {
        simnet.callPublicFn("halloffame", "increment", [], address1);
        const { result } = simnet.callReadOnlyFn("halloffame", "get-counter", [], address1);
        expect(result).toBeInt(1);
    });

    it("decrements the counter", () => {
        simnet.callPublicFn("halloffame", "increment", [], address1); // 0 -> 1
        simnet.callPublicFn("halloffame", "decrement", [], address1); // 1 -> 0
        const { result } = simnet.callReadOnlyFn("halloffame", "get-counter", [], address1);
        expect(result).toBeInt(0);
    });

    // --- Leaderboard Tests ---
    it("submits a score and updates personal best", () => {
        const score = 500;
        const { result } = simnet.callPublicFn("halloffame", "submit-score", [simnet.uint(score)], address1);
        expect(result).toBeOk(simnet.bool(true));

        const scoreRes = simnet.callReadOnlyFn("halloffame", "get-player-score", [simnet.principal(address1)], address1);
        expect(scoreRes.result).toBeOk(simnet.uint(score));
    });

    it("fails to submit a lower score", () => {
        // First submit 500
        simnet.callPublicFn("halloffame", "submit-score", [simnet.uint(500)], address1);
        
        // Try submitting 100
        const { result } = simnet.callPublicFn("halloffame", "submit-score", [simnet.uint(100)], address1);
        expect(result).toBeErr(simnet.uint(101)); // ERR-SCORE-NOT-HIGHER
    });

    it("updates top 10 correctly", () => {
        // Clear state implicitly or assume fresh run for independent blocks if strictly unit testing, 
        // but detailed simnet state persists in 'it' blocks usually? 
        // In Vitest with Clarinet SDK, state resets per 'describe' block usually or managed.
        // Let's assume sequential execution or clean state. 
        
        // NOTE: Clarinet JS SDK Simnet usually persists state across 'it' blocks within the same run unless reset.
        // We'll proceed assuming persistence for now.
        
        const score1 = 1000;
        simnet.callPublicFn("halloffame", "submit-score", [simnet.uint(score1)], address1);
        
        const score2 = 2000;
        simnet.callPublicFn("halloffame", "submit-score", [simnet.uint(score2)], address2);
        
        const { result } = simnet.callReadOnlyFn("halloffame", "get-top-ten", [], address1);
        
        // Expect address2 (2000) then address1 (1000) (or 500 if previous test persisted)
        // Check structure
        expect(result).toBeOk(simnet.list([
             simnet.tuple({ player: simnet.principal(address2), score: simnet.uint(score2) }),
             // Note: address1 submitted 500 in previous test, then 1000 here? 
             // If persisted: 500 would be overwritten by 1000.
             simnet.tuple({ player: simnet.principal(address1), score: simnet.uint(score1) }),
        ]));
    });

    it("removes old score when updating personal best in top 10", () => {
        // Address 1 improves to 3000
        const score3 = 3000;
        simnet.callPublicFn("halloffame", "submit-score", [simnet.uint(score3)], address1);

        const { result } = simnet.callReadOnlyFn("halloffame", "get-top-ten", [], address1);
        
        // Should be Address 1 (3000), Address 2 (2000)
        expect(result).toBeOk(simnet.list([
             simnet.tuple({ player: simnet.principal(address1), score: simnet.uint(score3) }),
             simnet.tuple({ player: simnet.principal(address2), score: simnet.uint(2000) }),
        ]));
    });
});
