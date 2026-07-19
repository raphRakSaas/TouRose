begin;
select plan(4);

select has_table('public', 'recommendation_weights', 'recommendation_weights exists');
select has_table('public', 'recommendation_impressions', 'recommendation_impressions exists');
select has_function('public', 'score_public_event_recommendations', array['jsonb'], 'scoring rpc exists');

select ok(
  jsonb_array_length(
    public.score_public_event_recommendations(
      jsonb_build_object('interests', '["Concerts"]'::jsonb, 'limit', 3)
    )
  ) <= 3,
  'scoring rpc returns at most 3 picks'
);

select * from finish();
rollback;
