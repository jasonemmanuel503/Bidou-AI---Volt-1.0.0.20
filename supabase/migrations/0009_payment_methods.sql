-- Lists every table / function / trigger / index / type / column that your migration files
-- create but that is MISSING in your database. Zero rows = everything is in place.
with expected(kind, name, created_in) as (
  select 'table', n, f from (values
    ('profiles','0000_profiles.sql'),
    ('credit_wallets','0000_profiles.sql'),
    ('plan_tiers','0001_tiers_and_purchases.sql'),
    ('credit_packages','0001_tiers_and_purchases.sql'),
    ('tier_purchases','0001_tiers_and_purchases.sql'),
    ('user_tier_badges','0001_tiers_and_purchases.sql'),
    ('admin_credentials','0002_admin_credentials.sql'),
    ('referrals','0005_affiliates.sql'),
    ('referral_rewards','0005_affiliates.sql'),
    ('user_media_badges','0006_unified_tiers.sql'),
    ('generation_jobs','0006_unified_tiers.sql'),
    ('ai_models','0008_generation_engine.sql'),
    ('generation_job_variants','0008_generation_engine.sql'),
    ('credit_transactions','0008_generation_engine.sql'),
    ('credit_reservations','0008_generation_engine.sql'),
    ('user_payment_methods','0009_payment_methods.sql'),
    ('generation_upscales','0009_schema_repair_and_asset_engine.sql'),
    ('generation_downloads','0009_schema_repair_and_asset_engine.sql'),
    ('platform_stats','0010_platform_stats.sql'),
    ('projects','0010_projects_and_trash.sql'),
    ('project_items','0010_projects_and_trash.sql'),
    ('favorites','20260920000000_favorites_and_playlists.sql'),
    ('playlists','20260920000000_favorites_and_playlists.sql'),
    ('playlist_items','20260920000000_favorites_and_playlists.sql'),
    ('payments','20260921000000_credit_grants_and_lockdown.sql')
  ) t(n,f)
  union all select 'function', n, f from (values
    ('generate_affiliate_code','0000_profiles.sql'),
    ('handle_new_user','0000_profiles.sql'),
    ('award_tier_badge','0001_tiers_and_purchases.sql'),
    ('verify_admin_pin','0002_admin_credentials.sql'),
    ('qualify_referral_on_first_purchase','0005_affiliates.sql'),
    ('handle_generation_job_completed','0006_unified_tiers.sql'),
    ('reserve_credits','0008_generation_engine.sql'),
    ('settle_reservation','0008_generation_engine.sql'),
    ('sweep_expired_reservations','0008_generation_engine.sql'),
    ('touch_updated_at','0009_payment_methods.sql'),
    ('bump_total_users','0010_platform_stats.sql'),
    ('bump_paid_users','0010_platform_stats.sql'),
    ('admin_set_platform_stat','0010_platform_stats.sql'),
    ('sync_project_item_count','0010_projects_and_trash.sql'),
    ('reorder_project_items','0010_projects_and_trash.sql'),
    ('move_project_item','0010_projects_and_trash.sql'),
    ('trash_retention_interval','0010_projects_and_trash.sql'),
    ('trash_variants','0010_projects_and_trash.sql'),
    ('restore_variants','0010_projects_and_trash.sql'),
    ('purge_variants_now','0010_projects_and_trash.sql'),
    ('check_playlist_item_music_only','20260920000000_favorites_and_playlists.sql'),
    ('touch_playlist_updated_at','20260920000000_favorites_and_playlists.sql'),
    ('touch_playlist_on_item_change','20260920000000_favorites_and_playlists.sql'),
    ('ensure_wallet','20260921000000_credit_grants_and_lockdown.sql'),
    ('grant_purchase','20260921000000_credit_grants_and_lockdown.sql'),
    ('debit_credits','20260921000000_credit_grants_and_lockdown.sql'),
    ('refund_credits','20260921000000_credit_grants_and_lockdown.sql'),
    ('reserve_credits_for','20260921000000_credit_grants_and_lockdown.sql')
  ) t(n,f)
  union all select 'trigger', n, f from (values
    ('on_auth_user_created','0000_profiles.sql'),
    ('trg_award_tier_badge','0001_tiers_and_purchases.sql'),
    ('trg_qualify_referral','0005_affiliates.sql'),
    ('trg_generation_job_completed','0006_unified_tiers.sql'),
    ('trg_upm_touch','0009_payment_methods.sql'),
    ('trg_bump_total_users','0010_platform_stats.sql'),
    ('trg_bump_paid_users','0010_platform_stats.sql'),
    ('trg_project_item_count','0010_projects_and_trash.sql'),
    ('trg_playlist_items_music_only','20260920000000_favorites_and_playlists.sql'),
    ('trg_playlist_updated_at','20260920000000_favorites_and_playlists.sql'),
    ('trg_playlist_touch_items','20260920000000_favorites_and_playlists.sql')
  ) t(n,f)
  union all select 'index', n, f from (values
    ('idx_tier_purchases_user','0001_tiers_and_purchases.sql'),
    ('idx_user_tier_badges_user','0001_tiers_and_purchases.sql'),
    ('idx_referrals_referrer','0005_affiliates.sql'),
    ('idx_rewards_unpaid','0005_affiliates.sql'),
    ('generation_jobs_idempotency_idx','0008_generation_engine.sql'),
    ('gjv_job_idx','0008_generation_engine.sql'),
    ('credit_tx_user_idx','0008_generation_engine.sql'),
    ('upm_user_idx','0009_payment_methods.sql'),
    ('upm_one_primary_per_user','0009_payment_methods.sql'),
    ('generation_jobs_user_recent_idx','0009_schema_repair_and_asset_engine.sql'),
    ('gu_variant_idx','0009_schema_repair_and_asset_engine.sql'),
    ('gu_variant_scale_idx','0009_schema_repair_and_asset_engine.sql'),
    ('gd_user_idx','0009_schema_repair_and_asset_engine.sql'),
    ('projects_user_name_idx','0010_projects_and_trash.sql'),
    ('projects_user_pos_idx','0010_projects_and_trash.sql'),
    ('project_items_project_pos_idx','0010_projects_and_trash.sql'),
    ('project_items_variant_idx','0010_projects_and_trash.sql'),
    ('gjv_purge_idx','0010_projects_and_trash.sql'),
    ('gjv_trash_idx','0010_projects_and_trash.sql'),
    ('favorites_user_created_idx','20260920000000_favorites_and_playlists.sql'),
    ('favorites_variant_idx','20260920000000_favorites_and_playlists.sql'),
    ('playlists_user_name_idx','20260920000000_favorites_and_playlists.sql'),
    ('playlists_user_pos_idx','20260920000000_favorites_and_playlists.sql'),
    ('playlist_items_playlist_pos_idx','20260920000000_favorites_and_playlists.sql'),
    ('playlist_items_variant_idx','20260920000000_favorites_and_playlists.sql'),
    ('payments_user_idx','20260921000000_credit_grants_and_lockdown.sql'),
    ('payments_ref_idx','20260921000000_credit_grants_and_lockdown.sql'),
    ('idx_generation_job_variants_user_status_created','20260922000000_library_scale.sql'),
    ('idx_project_items_project_position','20260922000000_library_scale.sql')
  ) t(n,f)
  union all select 'type', n, f from (values
    ('plan_tier','0001_tiers_and_purchases.sql'),
    ('media_tab','0001_tiers_and_purchases.sql'),
    ('payment_rail','0001_tiers_and_purchases.sql'),
    ('referral_status','0005_affiliates.sql'),
    ('reward_kind','0005_affiliates.sql')
  ) t(n,f)
  union all select 'column', n, f from (values
    ('profiles.plan_tier','0001_tiers_and_purchases.sql'),
    ('profiles.affiliate_code','0005_affiliates.sql'),
    ('profiles.referred_by','0005_affiliates.sql'),
    ('profiles.lifetime_spend_fcfa','0006_unified_tiers.sql'),
    ('generation_jobs.batch_count','0008_generation_engine.sql'),
    ('generation_jobs.aspect_ratio','0008_generation_engine.sql'),
    ('generation_jobs.resolution','0008_generation_engine.sql'),
    ('generation_jobs.duration_seconds','0008_generation_engine.sql'),
    ('generation_jobs.provider','0008_generation_engine.sql'),
    ('generation_jobs.enhanced_prompt','0008_generation_engine.sql'),
    ('generation_jobs.negative_prompt','0008_generation_engine.sql'),
    ('generation_jobs.genre','0008_generation_engine.sql'),
    ('generation_jobs.tonality','0008_generation_engine.sql'),
    ('generation_jobs.lyrics','0008_generation_engine.sql'),
    ('generation_jobs.cover_art_url','0008_generation_engine.sql'),
    ('generation_jobs.credits_reserved','0008_generation_engine.sql'),
    ('generation_jobs.credits_consumed','0008_generation_engine.sql'),
    ('generation_jobs.credits_refunded','0008_generation_engine.sql'),
    ('generation_jobs.reservation_id','0008_generation_engine.sql'),
    ('generation_jobs.idempotency_key','0008_generation_engine.sql'),
    ('generation_jobs.error_message','0008_generation_engine.sql'),
    ('generation_jobs.started_at','0008_generation_engine.sql'),
    ('generation_jobs.completed_at','0008_generation_engine.sql'),
    ('generation_jobs.output_urls','0009_schema_repair_and_asset_engine.sql'),
    ('generation_jobs.thumbnail_url','0009_schema_repair_and_asset_engine.sql'),
    ('generation_jobs.deleted_at','0009_schema_repair_and_asset_engine.sql'),
    ('generation_jobs.retry_of_job_id','0009_schema_repair_and_asset_engine.sql'),
    ('generation_jobs.client_settings','0009_schema_repair_and_asset_engine.sql'),
    ('generation_job_variants.deleted_at','0009_schema_repair_and_asset_engine.sql'),
    ('generation_job_variants.upscaled_urls','0009_schema_repair_and_asset_engine.sql'),
    ('ai_models.max_upscale','0009_schema_repair_and_asset_engine.sql'),
    ('ai_models.upscale_credit_cost','0009_schema_repair_and_asset_engine.sql'),
    ('ai_models.prompt_style_guide','0009_schema_repair_and_asset_engine.sql'),
    ('generation_job_variants.purge_after','0010_projects_and_trash.sql'),
    ('generation_job_variants.deleted_by_tier','0010_projects_and_trash.sql'),
    ('generation_job_variants.storage_path','0010_projects_and_trash.sql'),
    ('generation_job_variants.purged_at','0010_projects_and_trash.sql')
  ) t(n,f)
)
select kind, name, created_in as "created in file"
from expected e
where case kind
  when 'table'    then to_regclass('public.' || name) is null
  when 'index'    then to_regclass('public.' || name) is null
  when 'function' then not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = name)
  when 'trigger'  then not exists (select 1 from pg_trigger where tgname = name and not tgisinternal)
  when 'type'     then not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = name)
  when 'column'   then not exists (select 1 from information_schema.columns
                                   where table_schema = 'public'
                                     and table_name = split_part(name, '.', 1)
                                     and column_name = split_part(name, '.', 2))
end
order by created_in, kind, name;
