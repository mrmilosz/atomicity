#!/usr/bin/perl -wT 

use strict;
use CGI qw(standard -utf8);
use CGI::Carp qw(fatalsToBrowser);

my $cgi = new CGI();
print $cgi->header();

my $upload_dir = 'xml';

my $destination_dir = $cgi->url_param('destination');
if (defined $destination_dir) {
	if ($destination_dir =~ /^([-\/\@\w.]+)$/) {
		$upload_dir = $1;
	}
	else {
		die "Bad filename";
	}
}

for my $filename ($cgi->param()) {
	if ($filename =~ /^([-\@\w.]+)$/) {
		$filename = $1;
	}
	else {
		die "Bad filename";
	}

	my $upload_path = "$upload_dir/$filename";
	print $upload_path;

	open (DESTINATION_FILE, ">$upload_path") or die "$!";
	binmode DESTINATION_FILE;
	print DESTINATION_FILE $cgi->param($filename);
	close DESTINATION_FILE;
}
