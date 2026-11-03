import pytest

from emporio_agent.rate_limit import RateLimited, RateLimiter
from tests.fakes import FakeClock

LIMIT = 10
WINDOW_SECONDS = 60


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def limiter(clock: FakeClock) -> RateLimiter:
    return RateLimiter(LIMIT, WINDOW_SECONDS, clock=clock)


def fill(limiter: RateLimiter, key: str) -> None:
    for _ in range(LIMIT):
        limiter.check(key)


def test_requests_up_to_the_limit_are_allowed(limiter):
    fill(limiter, "1.1.1.1")


def test_request_over_the_limit_raises_with_retry_after_rounded_up(limiter, clock):
    fill(limiter, "1.1.1.1")
    clock.advance(20.5)

    with pytest.raises(RateLimited) as raised:
        limiter.check("1.1.1.1")

    assert raised.value.retry_after_seconds == 40


def test_other_keys_are_unaffected(limiter):
    fill(limiter, "1.1.1.1")

    limiter.check("2.2.2.2")


def test_limit_resets_after_the_window(limiter, clock):
    fill(limiter, "1.1.1.1")
    clock.advance(WINDOW_SECONDS)

    limiter.check("1.1.1.1")


def test_expired_entries_are_dropped(limiter, clock):
    limiter.check("1.1.1.1")
    clock.advance(WINDOW_SECONDS)

    limiter.check("2.2.2.2")

    assert len(limiter) == 1
