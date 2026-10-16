
// TODO: Add a check to see if they have saved, to avoid leaving the page accidentally.

//<script>
"use strict";

var BroadcasterWhiteList = function( rgBroadcasters )
{
		this.m_rgBroadcasters = rgBroadcasters || [];

 	this.m_bDirty = false;
};

BroadcasterWhiteList.prototype.OnLoad= function()
{
		var container = $J('#broadcasters_table');
	container.sortable( {
		cancel: ".ui-state-disabled",
		items: "> .broadcaster_row",
		axis: "y",
		cursor: "move",
	});
	container.on( "sortupdate", function( event, ui ) {
		g_BroadcasterWhiteList.OnSortUpdate(  );
	});

	container.disableSelection(); 
	this.AddAllRows();
}

BroadcasterWhiteList.prototype.SetDirty = function( bDirty )
{
	this.m_bDirty = bDirty;

	if( bDirty )
	{
		$J( '#broadcast_dirty' ).show();
	}
	else
	{
		$J( '#broadcast_dirty' ).hide();
	}
}

BroadcasterWhiteList.prototype.OnSortUpdate = function()
{
	this.SetDirty( true );

		$J( '.broadcaster_row > .number').each( function( index ) {
		$J(this).text( index + 1 );
	});

	$J( '.broadcaster_row :input' ).each( function( index ) {
		$J(this).attr( 'name', 'app[broadcast][whitelist][' + index + '][steamid]' );
	} );
}

BroadcasterWhiteList.prototype.AddBroadcasterRow = function( idx, broadcaster )
{
	var template = "\n\t\t<div class=\"edit_broadcasters broadcaster_row\">\n\t\t\t<div class=\"grabber_img\"><img class=\"broadcasters_grabber_img\" src=\"https:\/\/partner.steamgames.com\/public\/images\/\/broadcast\/drag_handle.png\"><\/div>\n\t\t\t<div class=\"number\">%3$s<\/div>\n\t\t\t<div class=\"streamer_avatar\"><img src=\"%4$s\"><\/div>\n\t\t\t<div class=\"streamer_name\">%5$s<\/div>\n\t\t\t<div class=\"action_ctn\">\n\t\t\t\t<a class=\"btn_grey_grey btn_medium ttip\" target=\"_blank\" href=\"%7$s\/%2$s\" data-tooltip-text=\"\u30b3\u30df\u30e5\u30cb\u30c6\u30a3\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u30da\u30fc\u30b8\u3092\u958b\u304f\">\n\t\t\t\t\t<span><img src=\"https:\/\/partner.steamgames.com\/public\/images\/broadcast\/view_broadcaster_profile.png\"><\/span>\n\t\t\t\t<\/a>\n\t\t\t\t<a class=\"btn_grey_grey btn_medium ttip\" href=\"#\" onclick=\"g_BroadcasterWhiteList.RemoveBroadcaster( this.parentNode.parentNode, %1$s ); return false;\" data-tooltip-text=\"\u8a31\u53ef\u30ea\u30b9\u30c8\u304b\u3089\u914d\u4fe1\u8005\u3092\u524a\u9664\">\n\t\t\t\t\t<span><img src=\"https:\/\/partner.steamgames.com\/public\/images\/broadcast\/remove_broadcaster.png\"><\/span>\n\t\t\t\t<\/a>\n\t\t\t<\/div>\n\t\t\t<input type=\"hidden\" name=\"app[broadcast][whitelist][%6$s][steamid]\" value=\"%2$s\">\n\t\t<\/div>";

	var $table = $J('#broadcasters_table');

	var $el = $J( template.replace(/%1\$s/g, broadcaster.m_nAccountID )
		.replace(/%2\$s/g, broadcaster.m_strSteamID )
		.replace(/%3\$s/g, idx + 1 )
		.replace(/%4\$s/g, broadcaster.m_strAvatarImgURL )
		.replace(/%5\$s/g, V_EscapeHTML( JSON.stringify( broadcaster.m_strPersonaName ) ) )
		.replace(/%6\$s/g, idx )
		.replace(/%7\$s/g, 'https://steamcommunity.com//profiles' )
	);

	$table.append($el);
}

BroadcasterWhiteList.prototype.AddAllRows = function()
{
	var $table = $J('#broadcasters_table');
	$J("#broadcasters_table > *:not(.heading)").remove();

	var _this = this;
	$J.each(this.m_rgBroadcasters, function(idx, broadcaster ){
		_this.AddBroadcasterRow(idx, broadcaster);
	});

	$table.sortable( "refresh" );
}

BroadcasterWhiteList.prototype.BHasBroadcaster = function( broadcaster )
{
	for( var i = 0; i < this.m_rgBroadcasters.length; ++i )
	{
		if( this.m_rgBroadcasters[i].m_nAccountID == broadcaster.m_nAccountID )
		{
			return true; 		}
	}
	return false;
}

BroadcasterWhiteList.prototype.AddBroadcaster = function( broadcaster )
{
		if( !broadcaster || this.BHasBroadcaster( broadcaster ) )
	{
		return;
	}

	this.AddBroadcasterRow( this.m_rgBroadcasters.length, broadcaster );

	this.m_rgBroadcasters.push( broadcaster );
	this.SetDirty( true );

	$J('#broadcasters_table').sortable( "refresh" );
}

BroadcasterWhiteList.prototype.AddSteamIDBroadcaster = function( broadcasterSteamID, nItemID )
{
	if (!broadcasterSteamID) {
		return;
	}

	var params = {};
	params[ 'steamid' ] = broadcasterSteamID;
	params[ 'sessionid' ] = g_sessionID;
	var _this = this;

	new Ajax.Request( 'https://partner.steamgames.com/admin/game/ajaxgetbroadcasterinfo/' + nItemID, {
		method: 'post',
		requestHeaders: { 'Accept': 'application/json' },
		parameters: params,
		onSuccess: function( transport )
		{
			$J('#choose_friend_throbber').hide();
			console.log( transport.responseJSON );
			console.log( transport.responseJSON.msg  );
			if( transport.responseJSON.success )
			{
				var broadcaster = transport.responseJSON.broadcasterinfo;
				_this.AddBroadcaster( broadcaster );
			}
			else
			{
				ShowAlertDialog( "\u30a8\u30e9\u30fc",
					"\u30d5\u30ec\u30f3\u30c9\u306e\u8aad\u307f\u8fbc\u307f\u3067\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u5f8c\u3067\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002\u8a73\u7d30:<br\/>%1$s".replace( /%1\$s/g, transport.responseJSON.msg ) );
			}
		},
		onFailure: function( transport )
		{
			ShowAlertDialog( "\u30a8\u30e9\u30fc",
				"\u30d5\u30ec\u30f3\u30c9\u306e\u8aad\u307f\u8fbc\u307f\u3067\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u5f8c\u3067\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002\u8a73\u7d30:<br\/>%1$s".replace( /%1\$s/g, transport.responseJSON.msg ) );
			$J('#choose_friend_throbber').hide();
		}
	});
	return false;
}

BroadcasterWhiteList.prototype.RemoveBroadcaster = function( elementToRemove, accountid )
{
	for( var i = 0; i < this.m_rgBroadcasters.length; ++i )
	{
		if( this.m_rgBroadcasters[i].m_nAccountID == accountid )
		{
			this.m_rgBroadcasters.splice( i, 1 ); 		}
	}

	elementToRemove.remove();
	this.SetDirty( true );

		$J( '.broadcaster_row > .number').each( function( index ) {
		$J(this).text( index + 1 );
	});


	$J('#broadcasters_table').sortable( "refresh" );
}

BroadcasterWhiteList.prototype.ClearAll = function ()
{
	if( this.m_rgBroadcasters.length != 0 )
	{
		this.m_rgBroadcasters = [];
		this.AddAllRows();
	}
}

BroadcasterWhiteList.prototype.ChooseBroadcasterFromFriends = function( mySteamID, nItemID )
{
	$J( '#choose_friend_throbber' ).show();

	var params = {};
	params['steamid'] = mySteamID;
	params[ 'sessionid' ] = g_sessionID;

	new Ajax.Request( 'https://partner.steamgames.com/admin/game/ajaxlistfriends/' + nItemID, {
		method: 'post',
		requestHeaders: { 'Accept': 'application/json' },
		parameters: params,
		onSuccess: function( transport )
		{
			$J('#choose_friend_throbber').hide();
			var dialog = ShowConfirmDialog( '追加する配信者を Steam フレンドリストから選択', $J( transport.responseText ) );

			dialog.SetRemoveContentOnDismissal( false );
			dialog.done( function()
			{
				$J("input[name=friend]:checked").each( function( index ) {
					var broadcaster = $J( this ).parent().parent().data( 'broadcaster' );
					g_BroadcasterWhiteList.AddBroadcaster( broadcaster );
				});
			} );
		},
		onFailure: function( transport )
		{
			ShowAlertDialog( "\u30a8\u30e9\u30fc",
				"\u30d5\u30ec\u30f3\u30c9\u306e\u8aad\u307f\u8fbc\u307f\u3067\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u5f8c\u3067\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002\u8a73\u7d30:<br\/>%1$s".replace( /%1\$s/g, transport.responseJSON.msg ) );
			$J('#choose_friend_throbber').hide();
		}
	});
	return false;
}

